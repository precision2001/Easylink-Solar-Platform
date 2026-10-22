/**
 * EasyLink phone agent (voice-agent/): one always-on Fargate task in Sydney that
 * registers with LiveKit Cloud and answers the calls Crazytel sends there.
 *
 * Secrets you fill in once in the console (Secrets Manager → each secret → Retrieve → Edit):
 *   easylink/voice/livekit   {"LIVEKIT_URL":"wss://<project>.livekit.cloud","LIVEKIT_API_KEY":"…","LIVEKIT_API_SECRET":"…"}
 *   easylink/voice/deepgram  {"DEEPGRAM_API_KEY":"…"}
 *   easylink/voice/egress    {"EGRESS_AWS_ACCESS_KEY_ID":"…","EGRESS_AWS_SECRET_ACCESS_KEY":"…"}   (the easylink-call-recording user's key)
 * The service starts with 0 tasks; set desiredCount (context voiceTasks=1) once they're filled.
 */
import { Duration, RemovalPolicy, Stack, CfnOutput, type StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import type { Construct } from "constructs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export type VoiceStackProps = StackProps & {
  /** The AI platform's API (voice routes live under /voice). */
  platformUrl: string;
  /** Shared key the agent sends as x-voice-key (a secret in the AI stack, encrypted with its KMS key). */
  voiceKeySecretName: string;
  aiKeyArn: string;
  recordingsBucket: string;
  llmModel: string;
  tasks: number;
};

export class EasyLinkVoiceStack extends Stack {
  constructor(scope: Construct, id: string, props: VoiceStackProps) {
    super(scope, id, props);

    // Public subnets only, no NAT: the task makes outbound calls (LiveKit, Deepgram, Bedrock, the API) and takes none in.
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2, natGateways: 0, subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }] });
    const sg = new ec2.SecurityGroup(this, "AgentSg", { vpc, allowAllOutbound: true, description: "EasyLink voice agent: outbound only" });

    const livekit = new secrets.Secret(this, "LiveKit", { secretName: "easylink/voice/livekit", description: "LiveKit Cloud project: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET. Set manually." });
    const deepgram = new secrets.Secret(this, "Deepgram", { secretName: "easylink/voice/deepgram", description: "DEEPGRAM_API_KEY. Set manually." });
    const egress = new secrets.Secret(this, "Egress", { secretName: "easylink/voice/egress", description: "Key LiveKit uses to save recordings (easylink-call-recording user): EGRESS_AWS_ACCESS_KEY_ID, EGRESS_AWS_SECRET_ACCESS_KEY. Set manually." });

    // Looked up by name (not passed as a construct) so the AI stack's key policy isn't changed from here.
    const voiceKey = secrets.Secret.fromSecretNameV2(this, "VoiceKey", props.voiceKeySecretName);

    const cluster = new ecs.Cluster(this, "Cluster", { vpc, clusterName: "easylink-voice", containerInsightsV2: ecs.ContainerInsights.ENABLED });
    const task = new ecs.FargateTaskDefinition(this, "Task", {
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.ARM64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX },
    });
    task.addContainer("agent", {
      image: ecs.ContainerImage.fromAsset(path.join(here, "..", "voice-agent"), { platform: Platform.LINUX_ARM64 }),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "agent", logGroup: new logs.LogGroup(this, "Logs", { logGroupName: "/easylink/voice-agent", retention: logs.RetentionDays.THREE_MONTHS, removalPolicy: RemovalPolicy.RETAIN }) }),
      environment: {
        AGENT_NAME: "easylink-voice",
        PLATFORM_URL: props.platformUrl,
        LLM_MODEL: props.llmModel,
        AWS_REGION: this.region,
        RECORDINGS_BUCKET: props.recordingsBucket,
        RECORD_CALLS: "true",
        STT_LANGUAGE: "en-AU",
        TTS_VOICE: "aura-2-theia-en",
      },
      secrets: {
        VOICE_KEY: ecs.Secret.fromSecretsManager(voiceKey),
        LIVEKIT_URL: ecs.Secret.fromSecretsManager(livekit, "LIVEKIT_URL"),
        LIVEKIT_API_KEY: ecs.Secret.fromSecretsManager(livekit, "LIVEKIT_API_KEY"),
        LIVEKIT_API_SECRET: ecs.Secret.fromSecretsManager(livekit, "LIVEKIT_API_SECRET"),
        DEEPGRAM_API_KEY: ecs.Secret.fromSecretsManager(deepgram, "DEEPGRAM_API_KEY"),
        EGRESS_AWS_ACCESS_KEY_ID: ecs.Secret.fromSecretsManager(egress, "EGRESS_AWS_ACCESS_KEY_ID"),
        EGRESS_AWS_SECRET_ACCESS_KEY: ecs.Secret.fromSecretsManager(egress, "EGRESS_AWS_SECRET_ACCESS_KEY"),
      },
      // LiveKit lets calls in progress finish before the task stops (Fargate allows up to 2 minutes).
      stopTimeout: Duration.seconds(120),
      portMappings: [{ containerPort: 8081 }],
    });

    task.obtainExecutionRole().addToPrincipalPolicy(new iam.PolicyStatement({ actions: ["kms:Decrypt"], resources: [props.aiKeyArn] }));

    // Claude on Bedrock through Australian inference profiles only.
    task.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse", "bedrock:ConverseStream"],
      resources: [`arn:aws:bedrock:${this.region}:${this.account}:inference-profile/au.*`, "arn:aws:bedrock:ap-southeast-*::foundation-model/*"],
    }));
    // Transcripts next to the recordings.
    task.taskRole.addToPrincipalPolicy(new iam.PolicyStatement({ actions: ["s3:PutObject"], resources: [`arn:aws:s3:::${props.recordingsBucket}/calls/*`] }));

    const service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: task,
      serviceName: "easylink-voice-agent",
      desiredCount: props.tasks,
      assignPublicIp: true,
      securityGroups: [sg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { enable: true, rollback: true },
      enableExecuteCommand: false,
    });

    new CfnOutput(this, "ServiceName", { value: service.serviceName });
    new CfnOutput(this, "SecretsToFill", { value: [livekit.secretName, deepgram.secretName, egress.secretName].join(", ") });
  }
}
