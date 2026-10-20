import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

/** Load secrets named by *_ARN env vars into process.env once per cold start. */
export async function loadSecrets() {
  const map: Record<string, string | undefined> = {
    AI_SERVICE_TOKEN: process.env.SECRETS_SERVICE_TOKEN_ARN,
    EVENT_INGEST_KEY: process.env.SECRETS_INGEST_KEY_ARN,
    SEARCH_API_KEY: process.env.SECRETS_SEARCH_KEY_ARN,
  };
  const sm = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" });
  await Promise.all(
    Object.entries(map).map(async ([name, arn]) => {
      if (!arn || process.env[name]) return;
      const r = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
      if (r.SecretString) process.env[name] = r.SecretString;
    }),
  );
}
