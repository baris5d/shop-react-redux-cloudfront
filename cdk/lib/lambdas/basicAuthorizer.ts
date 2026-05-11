import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

function buildPolicy(
  effect: "Allow" | "Deny",
  methodArn: string,
  principalId: string,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: methodArn,
        },
      ],
    },
  };
}

function decodeBasicToken(token: string): { username: string; password: string } | null {
  try {
    const decodedCredentials = Buffer.from(token, "base64").toString("utf-8");
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex <= 0) {
      return null;
    }

    const username = decodedCredentials.slice(0, separatorIndex);
    const password = decodedCredentials.slice(separatorIndex + 1);

    if (!username || !password) {
      return null;
    }

    return { username, password };
  } catch {
    return null;
  }
}

export async function basicAuthorizer(
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> {
  const authorizationToken = event.authorizationToken;

  if (!authorizationToken) {
    throw new Error("Unauthorized");
  }

  const [scheme, token] = authorizationToken.split(" ");
  if (scheme !== "Basic" || !token) {
    return buildPolicy("Deny", event.methodArn, "unauthorized");
  }

  const credentials = decodeBasicToken(token);
  if (!credentials) {
    return buildPolicy("Deny", event.methodArn, "unauthorized");
  }

  const expectedPassword = process.env[credentials.username];
  if (!expectedPassword || expectedPassword !== credentials.password) {
    return buildPolicy("Deny", event.methodArn, credentials.username);
  }

  return buildPolicy("Allow", event.methodArn, credentials.username);
}
