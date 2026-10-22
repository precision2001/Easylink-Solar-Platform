/**
 * AWS infrastructure for the EasyLink AI platform (spec 15). Region ap-southeast-2.
 *   npm run cdk -- synth        (review)
 *   npm run cdk -- deploy       (only after review; needs a deploy role, not root)
 *
 * Context (cdk.json or -c):
 *   backendApiBaseUrl  existing Express API, e.g. https://api.easylinksolar.com.au/api/v1
 *   filesBucket        bucket that holds customer documents (existing)
 *   modelFastId / modelSmartId  Bedrock inference profile ids (au.*)
 *   allowedOrigin      portal origin for CORS, e.g. https://easylinksolar.com.au
 */
import { App, Stack, Duration, RemovalPolicy, CfnOutput, type StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import { LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import * as ses from "aws-cdk-lib/aws-ses";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import type { Construct } from "constructs";
import { EasyLinkVoiceStack } from "./voice.js";

class EasyLinkAiStack extends Stack {
  voiceKey!: secrets.Secret;
  keyArn!: string;
  apiUrl!: string;
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const ctx = (k: string, d = "") => (this.node.tryGetContext(k) as string | undefined) ?? d;

    const key = new kms.Key(this, "AiKey", { enableKeyRotation: true, alias: "alias/easylink-ai" });

    const table = new dynamodb.TableV2(this, "AiTable", {
      tableName: "easylink-ai",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "ttl",
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      encryption: dynamodb.TableEncryptionV2.customerManagedKey(key),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
      globalSecondaryIndexes: [
        { indexName: "gsi1", partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING }, sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING } },
        { indexName: "gsi2", partitionKey: { name: "gsi2pk", type: dynamodb.AttributeType.STRING }, sortKey: { name: "gsi2sk", type: dynamodb.AttributeType.STRING } },
      ],
    });

    const bus = new events.EventBus(this, "CoreBus", { eventBusName: "easylink-core" });
    // Replayable archive of every event; 7 years covers contract-linked records.
    bus.archive("CoreArchive", { archiveName: "easylink-core-archive", eventPattern: { source: events.Match.prefix("easylink.") }, retention: Duration.days(2557) });

    const dlq = new sqs.Queue(this, "AiDlq", { retentionPeriod: Duration.days(14), encryption: sqs.QueueEncryption.KMS, encryptionMasterKey: key });
    const queue = new sqs.Queue(this, "AiQueue", {
      visibilityTimeout: Duration.minutes(6),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });
    // Everything except the AI's own audit noise goes to the AI runtime.
    new events.Rule(this, "ToAi", {
      eventBus: bus,
      eventPattern: { source: events.Match.prefix("easylink."), detailType: events.Match.anythingButPrefix("ai.") },
      targets: [new targets.SqsQueue(queue)],
    });

    const serviceToken = new secrets.Secret(this, "AiServiceToken", {
      secretName: "easylink/ai/service-token",
      description: "Bearer token for the AI service account in the existing backend (ADMIN user created for the AI platform). Set manually.",
      encryptionKey: key,
    });
    const ingestKey = new secrets.Secret(this, "IngestKey", {
      secretName: "easylink/ai/ingest-key",
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
      encryptionKey: key,
    });

    // Shared key for the phone agent (voice-agent/), sent as x-voice-key on /voice/*.
    this.voiceKey = new secrets.Secret(this, "VoiceKey", {
      secretName: "easylink/ai/voice-key",
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
      encryptionKey: key,
    });
    const searchKey = new secrets.Secret(this, "SearchApiKey", {
      secretName: "easylink/ai/search-api-key",
      description: "Web search API key used to find contacts that aren't on file (Brave Search). Set manually.",
      encryptionKey: key,
    });

    // Delivery receipts (email delivered / bounced / opened, SMS delivered / failed) → history.
    const receipts = new sns.Topic(this, "DeliveryReceipts", { topicName: "easylink-delivery-receipts", masterKey: key });
    // SES and End User Messaging SMS publish receipts here; both need the topic policy and the key.
    for (const service of ["ses.amazonaws.com", "sms-voice.amazonaws.com"]) {
      const principal = new iam.ServicePrincipal(service);
      receipts.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["sns:Publish"],
          principals: [principal],
          resources: [receipts.topicArn],
          conditions: { StringEquals: { "aws:SourceAccount": this.account } },
        }),
      );
      key.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ["kms:GenerateDataKey*", "kms:Decrypt"],
          principals: [principal],
          resources: ["*"],
          conditions: { StringEquals: { "aws:SourceAccount": this.account } },
        }),
      );
    }
    new CfnOutput(this, "DeliveryReceiptsTopicArn", { value: receipts.topicArn });
    const sesConfig = new ses.ConfigurationSet(this, "EmailConfig", { configurationSetName: "easylink-ai" });
    sesConfig.addEventDestination("ToReceipts", {
      destination: ses.EventDestination.snsTopic(receipts),
      events: [ses.EmailSendingEvent.DELIVERY, ses.EmailSendingEvent.BOUNCE, ses.EmailSendingEvent.COMPLAINT, ses.EmailSendingEvent.OPEN, ses.EmailSendingEvent.REJECT],
    });

    const filesBucketName = ctx("filesBucket");
    const env: Record<string, string> = {
      AI_TABLE: table.tableName,
      EVENT_BUS_NAME: bus.eventBusName,
      BACKEND_API_BASE_URL: ctx("backendApiBaseUrl"),
      FILES_BUCKET: filesBucketName,
      PUBLIC_SITE_URL: ctx("publicSiteUrl", "https://easylinksolar.com.au"),
      MODEL_FAST_ID: ctx("modelFastId"),
      MODEL_SMART_ID: ctx("modelSmartId"),
      EMAIL_FROM: ctx("emailFrom", "EasyLink Solar <hello@easylinksolar.com.au>"),
      SMS_ORIGINATOR: ctx("smsOriginator", "EasyLink"),
      SECRETS_SERVICE_TOKEN_ARN: serviceToken.secretArn,
      SECRETS_INGEST_KEY_ARN: ingestKey.secretArn,
      SECRETS_SEARCH_KEY_ARN: searchKey.secretArn,
      SECRETS_VOICE_KEY_ARN: this.voiceKey.secretArn,
      STAFF_EMAIL: ctx("staffEmail", "sales@easylinksolar.com.au"),
      PORTAL_BASE_URL: ctx("publicSiteUrl", "https://www.easylinksolar.com.au"),
      SES_CONFIGURATION_SET: "easylink-ai",
      // Create the SMS configuration set with an SNS destination to this topic in End User Messaging SMS, then set its name here.
      SMS_CONFIGURATION_SET: ctx("smsConfigurationSet"),
      PUBLIC_API_URL: ctx("publicApiUrl"),
      // "1" once backend-ai-platform.patch is deployed (projects, partners, assignments in the backend).
      BACKEND_PROJECTS_API: ctx("backendProjectsApi", "0"),
      NODE_OPTIONS: "--enable-source-maps",
    };

    const fn = (name: string, entry: string, timeout: Duration, memory = 1024) =>
      new NodejsFunction(this, name, {
        entry,
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: memory,
        timeout,
        environment: env,
        logGroup: new logs.LogGroup(this, `${name}Logs`, { retention: logs.RetentionDays.THREE_MONTHS, removalPolicy: RemovalPolicy.RETAIN }),
        tracing: lambda.Tracing.ACTIVE,
        bundling: { format: OutputFormat.ESM, target: "node22", banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);" },
      });

    const api = fn("ApiFn", "src/handlers/api.ts", Duration.seconds(29));
    const consumer = fn("AiConsumerFn", "src/handlers/ai-consumer.ts", Duration.minutes(5), 1536);
    const contact = fn("ContactEventsFn", "src/handlers/contact-events.ts", Duration.seconds(30), 512);
    consumer.addEventSource(new SqsEventSource(queue, { batchSize: 5, reportBatchItemFailures: true, maxConcurrency: 20 }));
    const delivery = fn("DeliveryReceiptsFn", "src/handlers/delivery-events.ts", Duration.seconds(30), 512);
    receipts.addSubscription(new LambdaSubscription(delivery));
    key.grantEncryptDecrypt(new iam.ServicePrincipal("ses.amazonaws.com"));

    for (const f of [api, consumer, contact, delivery]) {
      table.grantReadWriteData(f);
      bus.grantPutEventsTo(f);
      serviceToken.grantRead(f);
      ingestKey.grantRead(f);
      searchKey.grantRead(f);
    }
    this.voiceKey.grantRead(api);
    for (const f of [api, consumer]) {
      f.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "bedrock:Converse"],
          resources: [`arn:aws:bedrock:*::foundation-model/*`, `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`],
        }),
      );
    }
    consumer.addToRolePolicy(new iam.PolicyStatement({ actions: ["ses:SendEmail"], resources: ["*"] }));
    consumer.addToRolePolicy(new iam.PolicyStatement({ actions: ["sms-voice:SendTextMessage"], resources: ["*"] }));
    api.addToRolePolicy(new iam.PolicyStatement({ actions: ["ses:SendEmail", "sms-voice:SendTextMessage"], resources: ["*"] }));
    if (filesBucketName) {
      const files = s3.Bucket.fromBucketName(this, "FilesBucket", filesBucketName);
      files.grantRead(api);
      files.grantRead(consumer);
      // Job photos and bills uploaded through the portals land under jobs/.
      files.grantPut(api, "jobs/*");
      // Malware scan results (GuardDuty Malware Protection for S3 tags each object).
      for (const f of [api, consumer]) f.addToRolePolicy(new iam.PolicyStatement({ actions: ["s3:GetObjectTagging"], resources: [files.arnForObjects("*")] }));
    }

    const http = new apigw.HttpApi(this, "AiApi", {
      apiName: "easylink-ai",
      corsPreflight: {
        allowOrigins: [ctx("allowedOrigin", "https://easylinksolar.com.au")],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.PUT],
        allowHeaders: ["authorization", "content-type", "idempotency-key", "x-ingest-key", "x-visitor-id"],
      },
      defaultIntegration: new HttpLambdaIntegration("ApiIntegration", api),
    });

    new cloudwatch.Alarm(this, "DlqNotEmpty", {
      metric: dlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: "AI events failed 3 times and are waiting in the DLQ",
    });

    this.apiUrl = http.apiEndpoint;
    this.keyArn = key.keyArn;
    new CfnOutput(this, "ApiUrl", { value: http.apiEndpoint });
    new CfnOutput(this, "EventBusName", { value: bus.eventBusName });
    new CfnOutput(this, "ContactEventsFunction", { value: contact.functionName });
  }
}

const app = new App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: "ap-southeast-2" };
const ai = new EasyLinkAiStack(app, "EasyLinkAi", { env, description: "EasyLink Solar AI platform: events, actions, agents, inbox" });
new EasyLinkVoiceStack(app, "EasyLinkVoice", {
  env,
  description: "EasyLink Solar phone agent: LiveKit + Deepgram + Claude on Bedrock (Sydney)",
  platformUrl: ai.apiUrl,
  voiceKeySecretName: "easylink/ai/voice-key",
  aiKeyArn: ai.keyArn,
  recordingsBucket: String(app.node.tryGetContext("recordingsBucket") ?? "easylink-call-recordings"),
  llmModel: String(app.node.tryGetContext("voiceModelId") ?? "au.anthropic.claude-haiku-4-5-20251001-v1:0"),
  tasks: Number(app.node.tryGetContext("voiceTasks") ?? 0),
});
app.synth();
