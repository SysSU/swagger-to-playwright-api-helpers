import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const nonObjectArrayTypes: string[] = ["string", "number", "boolean"];

export default async function generateAPIHelpers(
  swaggerUrl: string,
  outputDir: string,
): Promise<void> {
  try {
    // Fetch the Swagger JSON from the provided URL
    const response = await axios.get(swaggerUrl);
    const swaggerJson = response.data;

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Copy base API helpers to the output directory
    console.log("Copying base API helpers...");
    const baseApiHelpersPath = path.join(__dirname, "base.ts");
    const baseApiHelpersOutputPath = path.join(outputDir, "Base.ts");
    fs.copyFileSync(baseApiHelpersPath, baseApiHelpersOutputPath);

    // Generate Playwright helpers from the Swagger JSON
    const helpers = generateHelpersFromSwagger(swaggerJson);

    // Write the generated helpers to separate files
    const outputPath = path.join(outputDir, "index.ts");
    fs.writeFileSync(outputPath, helpers);

    console.log(`Playwright helpers generated successfully at ${outputPath}`);
  } catch (error) {
    console.error("Error generating Playwright helpers:", error);
  }
}

function underscoreToPascalCase(name: string): string {
  return name
    .split("_")
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function underscoreToCamelCase(name: string): string {
  return name
    .split("_")
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

function cleanName(name: string): string {
  return name
    .replace(/[\/{}-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/_+$/, "");
}

function generateFunctionName(method: string, path: string): string {
  // Generate function name from method and path. Replace special characters with underscores. Remove trailing underscores. Replace multiple consecutive underscores with a single underscore.
  return underscoreToPascalCase(cleanName(`${method}_${path}`));
}

function generateInterfaceName(
  method: string,
  path: string,
  type: string,
): string {
  return `Interface${underscoreToCamelCase(cleanName(`${method}_${path}_${type}`))}`;
}

function generateHelpersFromSwagger(swaggerJson: any): string {
  const noDataMethods: string[] = ["get", "delete", "head", "options"];
  let helpers = ``;

  const interfaces: { [key: string]: string } = {};
  const importsString = `import Base, { RequestOptions } from './Base';\nimport { APIRequestContext, expect } from '@playwright/test';\n\n`;
  const classConstructor = `constructor(request: APIRequestContext, baseUrl: string) {\n  super(request, baseUrl);\n}\n`;
  const customOptionsInterface = `export interface options extends RequestOptions {\n  validateSuccess?: boolean\n}\n`;

  helpers += `export default class APIHelpers extends Base {\n ${classConstructor}\n`;

  for (const path in swaggerJson.paths) {
    for (const method in swaggerJson.paths[path]) {
      const operation = swaggerJson.paths[path][method];
      const params = operation.parameters || [];
      console.log(params);

      const functionName = generateFunctionName(method, path);

      const paramsInterfaceName = generateInterfaceName(method, path, "Params");
      const requestBodyTypeInterfaceDataName = generateInterfaceName(
        method,
        path,
        "Data",
      );
      const paramsInterface = generateParamsInterface(
        paramsInterfaceName,
        operation.parameters || [],
      );

      // Generate JSDoc comments
      let jsDoc = `/**\n * ${operation.summary || ""}\n *\n`;
      jsDoc += ` * @param {${paramsInterfaceName}} params - The request parameters\n`;
      params.forEach((param) => {
        jsDoc += ` * @param {${getTypeFromSchema(param.schema)}} params.${param.name} - ${param.description || ""}${param.in === "path" ? " (path parameter)" : ""}${param.in === "query" ? " (query parameter)" : ""}${param.in === "header" ? " (header parameter)" : ""}${param.required ? " (required)" : ""}\n`;
      });
      if (method !== "get") {
        jsDoc += ` * @param {${requestBodyTypeInterfaceDataName}} data - The request body\n`;
      }
      jsDoc += ` * @param {object} options - Additional request options\n`;
      jsDoc += ` * @param {boolean} options.validateSuccess - Whether to validate the response as successful\n`;
      jsDoc += ` */\n`;

      let requestBodyType = "any";
      if (operation.requestBody && operation.requestBody.content) {
        const contentType = Object.keys(operation.requestBody.content)[0];
        const schema = operation.requestBody.content[contentType].schema;
        if (schema.$ref) {
          requestBodyType = getDataTypeFromRef(schema.$ref, swaggerJson);
        } else {
          requestBodyType =
            getTypeFromSchema(schema) === "string"
              ? "any"
              : getTypeFromSchema(schema);
        }
      }

      const dataInterface =
        requestBodyType === "any"
          ? ""
          : `export interface ${requestBodyTypeInterfaceDataName} ${requestBodyType};\n`;

      let methodString = `${jsDoc}public async ${functionName}(params: ${paramsInterfaceName}, ${method !== "get" ? `data: ${requestBodyType === "any" ? "any" : requestBodyTypeInterfaceDataName}, ` : ""}options?: options): Promise<any> {\n`;

      methodString += `  let requestEndpoint = \`${constructPathFromPathParams(path, params)}\`;\n\n`;

      // Handle header parameters
      const headerParams = params.filter((param) => param.in === "header");
      if (headerParams.length > 0) {
        methodString += `  // Append header parameters\n`;
        methodString += `  const headerParameters = [\n`;
        headerParams.forEach((param) => {
          methodString += `    '${param.name}',\n`;
        });
        methodString += `  ];\n\n`;
      }

      // Create new options object
      methodString += `  const requestOptions: RequestOptions = {\n`;
      methodString += `    ...options,\n`;
      methodString += `    headers: {\n`;
      methodString += `      ...options?.headers,\n`;
      headerParams.forEach((param) => {
        methodString += `      '${param.name}': params['${param.name}'],\n`;
      });
      methodString += `    },\n`;
      methodString += `  };\n\n`;

      // check if query parameters are present
      const queryParams = params.filter((param) => param.in === "query");
      if (queryParams.length > 0) {
        methodString += `  // Append query parameters\n`;
        methodString += `  const queryParameters = [\n`;
        queryParams.forEach((param) => {
          methodString += `    '${param.name}',\n`;
        });
        methodString += `  ];\n\n`;
        methodString += `  if (params) {\n`;
        methodString += `    requestEndpoint += '?';\n`;
        methodString += `    Object.entries(params).map(([key, value]) => {\n`;
        methodString += `      if (queryParameters.includes(key)) {\n`;
        methodString += `        requestEndpoint += \`\${key}=\${value}&\`;\n`;
        methodString += `      }\n`;
        methodString += `    });\n`;
        methodString += `  }\n\n`;
      }
      methodString += `  const response = await this.${method.toUpperCase()}(requestEndpoint,\n`;
      methodString += !noDataMethods.includes(method) ? `    data,\n` : "";
      methodString += `    requestOptions,\n`;
      methodString += `  );\n\n`;
      methodString += `  // Validate response if validateSuccess is true\n`;
      methodString += `  if (options?.validateSuccess) {\n`;
      const expectedStatus = operation.responses["200"]
        ? 200
        : Object.keys(operation.responses)[0];
      methodString += `    expect(response.status()).toBe(${expectedStatus});\n`;
      methodString += `  }\n`;
      methodString += `  return response;\n`;
      methodString += `}\n\n`;

      helpers += methodString;
      interfaces[paramsInterfaceName] = paramsInterface;
      if (requestBodyType !== "any") {
        interfaces[requestBodyTypeInterfaceDataName] = dataInterface;
      }
    }
  }

  helpers += `}\n`;

  // Combine interfaces and helpers
  const interfaceString = Object.values(interfaces).join("\n\n");
  helpers = `${importsString}${interfaceString}${customOptionsInterface}\n\n\n${helpers}`;

  return helpers;
}

function generateParamsInterface(
  interfaceName: string,
  parameters: any[],
): string {
  let interfaceString = `export interface ${interfaceName} {\n`;

  parameters.forEach((param) => {
    let paramName = param.name;
    if (paramName.includes("-")) {
      paramName = `'${paramName}'`;
    }
    const paramType = param.schema ? getTypeFromSchema(param.schema) : "any";
    interfaceString += `  ${paramName}${!param.required && param.in !== "header" ? "?" : ""}: ${paramType};\n`;
  });

  interfaceString += `}`;
  return interfaceString;
}

function constructPathFromPathParams(path: string, parameters: any[]): string {
  let constructedPath = path;
  parameters.forEach((param) => {
    if (param.in === "path") {
      constructedPath = constructedPath.replace(
        `{${param.name}}`,
        `\${params.${param.name}}`,
      );
    }
  });
  return constructedPath;
}

function getTypeFromSchema(schema: any): string {
  if (!schema?.type && !schema?.$ref) {
    return "any";
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return `${getTypeFromSchema(schema.items)}[]`;
    case "object":
      let properties = schema.properties;

      if (!properties) {
        return `object /* ${schema.description || "No description available"} */`;
      }

      let interfaceString = "{\n";
      for (const key in properties) {
        interfaceString += `  ${key}?: ${getTypeFromSchema(properties[key])};\n`;
      }
      interfaceString += "}";
      return interfaceString;
    default:
      return "any";
  }
}

function getDataTypeFromRef($ref: string, swaggerJson: any): string {
  const refPath = $ref.replace("#/", "").split("/");
  let schema = swaggerJson;
  const schemaType = getTypeFromSchema(schema.components.schemas[refPath[2]]);

  return nonObjectArrayTypes.includes(schemaType) ? "any" : schemaType;
}
