import generator from "./index";

const swaggerUrl = process.env.SWAGGER_URL;
const outputDir = process.env.OUTPUT_DIR;

if (!swaggerUrl) {
  throw new Error("SWAGGER_URL environment variable is not defined");
}

if (!outputDir) {
  throw new Error("OUTPUT_DIR environment variable is not defined");
}

generator(swaggerUrl, outputDir);
