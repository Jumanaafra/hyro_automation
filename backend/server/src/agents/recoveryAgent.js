/**
 * Recovery Agent
 * Failure Categories:
 * - MISSING_FIELDS
 * - API_FAILURE
 * - AUTH_EXPIRED
 * - RATE_LIMIT
 * - TRANSIENT
 *
 * Decisions:
 * - Retry with Backoff
 * - Escalate
 */

class RecoveryAgent {
  classifyAndDecide(errorCategory, retryCount = 0, maxRetries = 3) {
    const category = errorCategory || 'TRANSIENT';

    switch (category) {
      case 'TRANSIENT':
      case 'RATE_LIMIT':
      case 'API_FAILURE':
        if (retryCount < maxRetries) {
          const backoffMs = Math.pow(2, retryCount) * 1000;
          return {
            decision: 'RETRY',
            category,
            backoffMs,
            retryCount: retryCount + 1,
            reason: `Transient error ${category}. Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries}).`
          };
        } else {
          return {
            decision: 'ESCALATE',
            category,
            backoffMs: 0,
            retryCount,
            reason: `Maximum retry count (${maxRetries}) exceeded for ${category}. Escalating.`
          };
        }

      case 'AUTH_EXPIRED':
        return {
          decision: 'ESCALATE',
          category,
          backoffMs: 0,
          retryCount,
          reason: 'Authentication credential expired (AUTH_EXPIRED). Requires re-authentication. Escalating.'
        };

      case 'MISSING_FIELDS':
        return {
          decision: 'ESCALATE',
          category,
          backoffMs: 0,
          retryCount,
          reason: 'Required data fields missing (MISSING_FIELDS). Cannot proceed safely. Escalating.'
        };

      default:
        return {
          decision: 'ESCALATE',
          category,
          backoffMs: 0,
          retryCount,
          reason: `Unrecoverable error category: ${category}. Escalating.`
        };
    }
  }
}

module.exports = new RecoveryAgent();
