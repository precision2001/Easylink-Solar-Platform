# Turning on email and SMS delivery receipts

Receipts make "Delivered", "Opened" and "Not delivered" show on every message
in the portals' History tab. Both channels publish to one SNS topic,
`easylink-delivery-receipts`, which the `DeliveryReceipts` Lambda reads.

Region: `ap-southeast-2` (Sydney). Run as an IAM user/role with admin rights
for SES, End User Messaging SMS and SNS — **not the root account**.

## 1. Deploy the stack (does email for you)

```bash
cd easylink-ai-platform
npx cdk deploy \
  -c backendApiBaseUrl=https://api.easylinksolar.com.au/api/v1 \
  -c publicApiUrl=https://ai.easylinksolar.com.au \
  -c filesBucket=<customer-files-bucket> \
  -c modelFastId=<bedrock-model-id> -c modelSmartId=<bedrock-model-id>
```

This creates:
- the SNS topic (KMS-encrypted) with a policy letting `ses.amazonaws.com` and
  `sms-voice.amazonaws.com` in this account publish, and key access for both;
- SES configuration set `easylink-ai` sending Delivery, Bounce, Complaint,
  Open and Reject events to the topic;
- output `DeliveryReceiptsTopicArn` — copy it for step 3.

Email receipts work as soon as the sending identity is verified:

```bash
aws sesv2 get-email-identity --email-identity easylinksolar.com.au --region ap-southeast-2 \
  --query '{verified:VerifiedForSendingStatus,dkim:DkimAttributes.Status}'
```

If it isn't verified, create it and add the three DKIM CNAMEs it returns to DNS:

```bash
aws sesv2 create-email-identity --email-identity easylinksolar.com.au --region ap-southeast-2
```

Still in the SES sandbox? Request production access in the SES console
(Account dashboard → Request production access) or SES only delivers to
verified addresses.

## 2. Check you have an SMS sender

```bash
aws pinpoint-sms-voice-v2 describe-sender-ids --region ap-southeast-2
aws pinpoint-sms-voice-v2 describe-phone-numbers --region ap-southeast-2
```

Australia accepts alphanumeric sender IDs (the platform uses `EasyLink`). If
none is listed, request one:

```bash
aws pinpoint-sms-voice-v2 request-sender-id --sender-id EasyLink \
  --iso-country-code AU --message-types TRANSACTIONAL --region ap-southeast-2
```

The account must also be out of the SMS sandbox (End User Messaging SMS
console → Account settings → Request production access).

## 3. SMS configuration set → the receipts topic (the one manual step)

```bash
TOPIC_ARN=<DeliveryReceiptsTopicArn from step 1>

aws pinpoint-sms-voice-v2 create-configuration-set \
  --configuration-set-name easylink-ai-sms --region ap-southeast-2

aws pinpoint-sms-voice-v2 create-event-destination \
  --configuration-set-name easylink-ai-sms \
  --event-destination-name to-receipts \
  --matching-event-types TEXT_DELIVERED TEXT_SUCCESSFUL TEXT_FAILED TEXT_BLOCKED \
      TEXT_INVALID TEXT_CARRIER_UNREACHABLE TEXT_TTL_EXPIRED \
  --sns-destination TopicArn=$TOPIC_ARN \
  --region ap-southeast-2
```

Console alternative: AWS End User Messaging SMS → Configuration sets → Create
→ name `easylink-ai-sms` → Event destinations → Add → Amazon SNS → existing
topic `easylink-delivery-receipts` → tick the delivered/successful and failure
events above.

## 4. Tell the platform to use it

```bash
npx cdk deploy -c smsConfigurationSet=easylink-ai-sms   # plus the context values from step 1
```

(or put `"smsConfigurationSet": "easylink-ai-sms"` in `cdk.json` → `context`).

## 5. Test

```bash
# Email: SES's simulator always delivers
aws sesv2 send-email --region ap-southeast-2 \
  --from-email-address hello@easylinksolar.com.au \
  --destination ToAddresses=success@simulator.amazonses.com \
  --content 'Simple={Subject={Data=Receipt test},Body={Text={Data=Test}}}' \
  --configuration-set-name easylink-ai

# SMS: to a phone you own
aws pinpoint-sms-voice-v2 send-text-message --region ap-southeast-2 \
  --destination-phone-number +614XXXXXXXX --origination-identity EasyLink \
  --message-body "EasyLink receipt test" --message-type TRANSACTIONAL \
  --configuration-set-name easylink-ai-sms

# Within a minute both should show here
aws logs tail /aws/lambda/<DeliveryReceipts function name> --since 10m --region ap-southeast-2
```

In the portal, a message sent through the platform then moves from **Sent** to
**Delivered** (or **Opened** for email, **Not delivered** on failure).

## Turning it off

`aws pinpoint-sms-voice-v2 delete-event-destination --configuration-set-name easylink-ai-sms --event-destination-name to-receipts`
stops SMS receipts; deleting the SES event destination (or the stack) stops
email receipts. Messages still send; they just stay at "Sent".
