import axios, { AxiosInstance } from "axios";
import type { WecomConfig } from "./types.js";
import { resolveWecomCredentials } from "./accounts.js";

const WECOM_API_BASE = "https://qyapi.weixin.qq.com/cgi-bin";

// Token cache: { corpId: { token, expireAt } }
const tokenCache = new Map<
  string,
  { token: string; expireAt: number }
>();

// Refresh lock to prevent concurrent refreshes
const refreshLocks = new Map<string, Promise<string>>();

function createAxiosInstance(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const apiClient = createAxiosInstance(WECOM_API_BASE);

export async function getWecomAccessToken(
  corpId: string,
  corpSecret: string
): Promise<string> {
  const cached = tokenCache.get(corpId);
  const now = Date.now();

  // Return cached token if still valid (with 5-minute buffer)
  if (cached && cached.expireAt > now + 5 * 60 * 1000) {
    return cached.token;
  }

  // Check if refresh is in progress
  const inProgress = refreshLocks.get(corpId);
  if (inProgress) {
    return inProgress;
  }

  // Start refresh
  const refreshPromise = (async () => {
    try {
      const response = await apiClient.get("/gettoken", {
        params: {
          corpid: corpId,
          corpsecret: corpSecret,
        },
      });

      if (response.data.errcode !== 0) {
        throw new Error(
          `Failed to get access token: ${response.data.errmsg} (${response.data.errcode})`
        );
      }

      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 7200; // Default 2 hours

      // Cache the token
      tokenCache.set(corpId, {
        token,
        expireAt: now + expiresIn * 1000,
      });

      return token;
    } catch (error) {
      refreshLocks.delete(corpId);
      throw error;
    }
  })();

  refreshLocks.set(corpId, refreshPromise);
  return refreshPromise;
}

export async function makeApiCall<T = any>(
  cfg: WecomConfig,
  apiPath: string,
  params: Record<string, any> = {},
  data: Record<string, any> | null = null,
  maxRetries = 3
): Promise<T> {
  const creds = resolveWecomCredentials(cfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const token = await getWecomAccessToken(creds.corpId!, creds.corpSecret!);
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await apiClient.request<T>({
        url: apiPath,
        method: data ? "POST" : "GET",
        params: {
          access_token: token,
          ...params,
        },
        data,
      });

      // Check for WeChat Work error codes
      const responseData = response.data as any;
      if (responseData && typeof responseData === "object") {
        if (responseData.errcode && responseData.errcode !== 0) {
          // Token expired, refresh and retry
          if (responseData.errcode === 40014 || responseData.errcode === 42001) {
            tokenCache.delete(creds.corpId!);
            if (i < maxRetries - 1) {
              continue;
            }
          }
          throw new Error(
            `API error ${responseData.errcode}: ${responseData.errmsg}`
          );
        }
      }

      return response.data;
    } catch (error) {
      lastError = error as Error;
      // Retry on network errors
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error("API call failed after retries");
}

export async function sendAppMessage(cfg: WecomConfig, message: {
  touser: string;
  msgtype: string;
  [key: string]: any;
}): Promise<{ errcode: number; errmsg: string; invaliduser?: string }> {
  return makeApiCall(cfg, "/message/send", {}, message);
}

export async function uploadMedia(
  cfg: WecomConfig,
  type: "image" | "voice" | "video" | "file",
  file: Buffer | NodeJS.ReadableStream,
  filename?: string
): Promise<{ media_id: string; type: string; created_at: number }> {
  const creds = resolveWecomCredentials(cfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const token = await getWecomAccessToken(creds.corpId!, creds.corpSecret!);

  // Use FormData for file upload
  const FormData = (await import("form-data")).default;
  const formData = new FormData();
  formData.append("media", file, filename);

  const response = await axios.post(
    `${WECOM_API_BASE}/media/upload?access_token=${token}&type=${type}`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
      },
    }
  );

  const data = response.data as any;
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`Failed to upload media: ${data.errmsg} (${data.errcode})`);
  }

  return data;
}

export async function downloadMedia(
  cfg: WecomConfig,
  mediaId: string
): Promise<Buffer> {
  const creds = resolveWecomCredentials(cfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const token = await getWecomAccessToken(creds.corpId!, creds.corpSecret!);

  const response = await axios.get<Buffer>(
    `${WECOM_API_BASE}/media/get?access_token=${token}&media_id=${mediaId}`,
    {
      responseType: "arraybuffer",
    }
  );

  return response.data;
}

export async function getUserInfo(
  cfg: WecomConfig,
  userId: string
): Promise<any> {
  return makeApiCall(cfg, "/user/get", { userid: userId });
}

export async function getDepartmentUsers(
  cfg: WecomConfig,
  departmentId = 1,
  fetchChild = true
): Promise<any> {
  return makeApiCall(cfg, "/user/list", {
    department_id: departmentId,
    fetch_child: fetchChild ? 1 : 0,
  });
}

export function clearTokenCache(): void {
  tokenCache.clear();
  refreshLocks.clear();
}
