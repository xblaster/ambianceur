// Configuration Jest commune (tests unitaires de shared/ et app/).
module.exports = {
  transform: {
    "^.+\.(t|j)sx?$": [
      "@swc/jest",
      { jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } } },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
};
