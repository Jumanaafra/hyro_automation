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

    // Type-specific field validations
    if (node.type === 'googleSheetsAppend' && (!output || output.rowsAppended === 0)) {
      return {
        isValid: false,
        errorCategory: 'MISSING_FIELDS',
        reason: 'Google Sheets node failed to append rows'
      };
    }

    if (node.type === 'aiDetailExtractor' && (!output || !output.records || output.records.length === 0)) {
      return {
        isValid: false,
        errorCategory: 'MISSING_FIELDS',
        reason: 'AI Extractor returned no structured records'
      };
    }

    return {
      isValid: true,
      errorCategory: null,
      reason: 'Output validated successfully'
    };
  }
}

module.exports = new ValidationAgent();
