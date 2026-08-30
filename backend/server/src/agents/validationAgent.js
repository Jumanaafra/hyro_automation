/**
 * Validation Agent
 * Responsibilities:
 * - Validate node output fields & schema integrity
 * - Prevent continuation when required output is missing/invalid
 */

class ValidationAgent {
  validateOutput(node, result) {
    if (!result) {
      return {
        isValid: false,
        errorCategory: 'MISSING_FIELDS',
        reason: `Node ${node.id} returned null or empty result`
      };
    }

    if (result.status === 'FAILED' || result.error) {
      return {
        isValid: false,
        errorCategory: 'API_FAILURE',
        reason: result.error || `Node ${node.id} execution failed`
      };
    }

    const { output } = result;
    const data = output?.data || output || {};

    // Type-specific field validations
    if (node.type === 'googleSheetsAppend') {
      // 0 rows appended is valid: no jobs found, or all were duplicates, or empty input
      // Only fail if there was an explicit API error (caught above via result.error/result.status=FAILED)
      // Do not fail on rowsAppended === 0 alone — that's a normal empty run
    }

    if (node.type === 'aiDetailExtractor') {
      const records = data.records || output?.records;
      if (records !== undefined && !Array.isArray(records)) {
        return {
          isValid: false,
          errorCategory: 'MISSING_FIELDS',
          reason: 'AI Extractor returned invalid records shape'
        };
      }
    }

    return {
      isValid: true,
      errorCategory: null,
      reason: 'Output validated successfully'
    };
  }
}

module.exports = new ValidationAgent();
