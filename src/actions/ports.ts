import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Outbound email and SMS (spec 10.5, 10.6). */
export type EmailAttachment = { fileName: string; contentType: string; bytes: Uint8Array };
export type EmailMessage = { to: string; subject: string; body: string; links?: string[]; attachments?: EmailAttachment[]; replyTo?: string };

export interface Messaging {
  sendEmail(m: EmailMessage): Promise<{ id: string }>;
  sendSms(m: { to: string; body: string }): Promise<{ id: string }>;
}

export class AwsMessaging implements Messaging {
  constructor(
    private from = process.env.EMAIL_FROM ?? "EasyLink Solar <hello@easylinksolar.com.au>",
    private smsOriginator = process.env.SMS_ORIGINATOR ?? "EasyLink",
    private ses = new SESv2Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" }),
    private sms = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" }),
  ) {}
  async sendEmail(m: EmailMessage) {
    const text = [m.body, ...(m.links?.length ? ["", ...m.links] : [])].join("\n");
    const r = await this.ses.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [m.to] },
        ReplyToAddresses: m.replyTo ? [m.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: m.subject },
            Body: { Text: { Data: text } },
            Attachments: m.attachments?.map((a) => ({ FileName: a.fileName, ContentType: a.contentType, RawContent: a.bytes, ContentDisposition: "ATTACHMENT" as const })),
          },
        },
      }),
    );
    return { id: r.MessageId ?? "" };
  }
  async sendSms(m: { to: string; body: string }) {
    const r = await this.sms.send(
      new SendTextMessageCommand({ DestinationPhoneNumber: m.to, MessageBody: m.body, OriginationIdentity: this.smsOriginator, MessageType: "TRANSACTIONAL" }),
    );
    return { id: r.MessageId ?? "" };
  }
}

export class FakeMessaging implements Messaging {
  sent: { channel: "email" | "sms"; to: string; subject?: string; body: string; links?: string[]; attachments?: EmailAttachment[] }[] = [];
  async sendEmail(m: EmailMessage) {
    this.sent.push({ channel: "email", ...m });
    return { id: `email_${this.sent.length}` };
  }
  async sendSms(m: { to: string; body: string }) {
    this.sent.push({ channel: "sms", ...m });
    return { id: `sms_${this.sent.length}` };
  }
}

/** Signed links for files stored in S3 (spec 11). */
export interface FileLinks {
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export class S3FileLinks implements FileLinks {
  constructor(private bucket = process.env.FILES_BUCKET ?? "", private s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {}
  signedUrl(key: string, expiresInSeconds: number) {
    // SigV4 presigned URLs are limited to 7 days.
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: Math.min(expiresInSeconds, 604800) });
  }
}

export class FakeFileLinks implements FileLinks {
  async signedUrl(key: string, expiresInSeconds: number) {
    return `https://files.example.test/${key}?expires=${expiresInSeconds}`;
  }
}
