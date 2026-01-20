export function parseSourceCode(sourceCode: string): string {
  let parsedSource = '';

  try {
    const jsonContent = JSON.parse(
      sourceCode.substring(1, sourceCode.length - 1),
    );
    parsedSource = jsonContent.sources;
  } catch (error) {
    console.error('Failed to parse nested source JSON');
  }

  return parsedSource;
}
