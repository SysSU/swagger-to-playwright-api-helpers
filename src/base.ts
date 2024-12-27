import { APIRequestContext } from "@playwright/test";

export interface RequestOptions {
  authToken?: string;
  headers?: Record<string, string>;
  endpoint?: string;
}

export class ApiHelpersBase {
  private request: APIRequestContext;
  private defaultEndpoint: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    this.request = request;
    this.defaultEndpoint = baseUrl;
  }

  private constructRequestHeaders(options?: RequestOptions) {
    const requestHeaders = options?.headers || {};
    if (options?.authToken) {
      requestHeaders["Authorization"] = `Bearer ${options.authToken}`;
    }
    return requestHeaders;
  }

  private constructRequestEndpoint(path: string, options?: RequestOptions) {
    return `${options?.endpoint || this.defaultEndpoint}${path}`;
  }

  private async makeRequest(
    method: string,
    path: string,
    data?: object,
    options?: RequestOptions,
  ) {
    const headers = this.constructRequestHeaders(options);
    const endpoint = this.constructRequestEndpoint(path, options);
    return await this.request[method](endpoint, { data, headers });
  }

  async GET(path: string, options?: RequestOptions) {
    return await this.makeRequest("get", path, undefined, options);
  }

  async POST(path: string, data: object, options?: RequestOptions) {
    return await this.makeRequest("post", path, data, options);
  }

  async PUT(path: string, data: object, options?: RequestOptions) {
    return await this.makeRequest("put", path, data, options);
  }

  async DELETE(path: string, options?: RequestOptions) {
    return await this.makeRequest("delete", path, undefined, options);
  }

  async PATCH(path: string, data: object, options?: RequestOptions) {
    return await this.makeRequest("patch", path, data, options);
  }
}

export default ApiHelpersBase;
