/**
 * SQL Diff Utility
 * 
 * Compares SQL queries using traditional unified diff format
 * Optimized for LLM comprehension (trained on billions of GitHub diffs)
 */

export interface SQLDiff {
  previous: string;
  current: string;
  unifiedDiff: string;
  criticalChanges: string[];
  summary: string;
}

export class SQLDiffTracker {
  /**
   * Compare two SQL queries and return a unified diff format
   */
  static compare(previousQuery: string | null, currentQuery: string): SQLDiff | null {
    if (!previousQuery) {
      return null; // First query, no diff
    }

    if (previousQuery.trim() === currentQuery.trim()) {
      return {
        previous: previousQuery,
        current: currentQuery,
        unifiedDiff: '',
        criticalChanges: [],
        summary: 'No changes - query is identical'
      };
    }

    const prev = previousQuery.trim().toUpperCase();
    const curr = currentQuery.trim().toUpperCase();
    const criticalChanges: string[] = [];

    // Build unified diff by clause
    const diffLines: string[] = [];
    
    // Compare each SQL clause
    const clauses = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT'];
    const nextClause = [...clauses.slice(1), null];
    
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const next = nextClause[i];
      
      const prevClause = this.extractClause(prev, clause, next);
      const currClause = this.extractClause(curr, clause, next);
      
      if (prevClause !== currClause) {
        diffLines.push(`@@ ${clause} clause @@`);
        
        if (prevClause && !currClause) {
          diffLines.push(`-${clause} ${prevClause}`);
          if (clause === 'WHERE') {
            criticalChanges.push(`CRITICAL: Entire WHERE clause was removed!`);
          }
        } else if (!prevClause && currClause) {
          diffLines.push(`+${clause} ${currClause}`);
        } else if (prevClause && currClause) {
          // Show detailed diff for this clause
          const prevParts = this.splitClauseParts(prevClause, clause);
          const currParts = this.splitClauseParts(currClause, clause);
          
          // Find removed parts
          prevParts.forEach(part => {
            if (!currParts.includes(part)) {
              diffLines.push(`-  ${part}`);
            }
          });
          
          // Find added parts
          currParts.forEach(part => {
            if (!prevParts.includes(part)) {
              diffLines.push(`+  ${part}`);
            }
          });
        }
        
        diffLines.push(''); // Blank line between sections
      }
    }

    // Check for critical filter losses
    const prevBranch = prev.match(/BRANCH_NAME\s*=\s*'([^']+)'/);
    const currBranch = curr.match(/BRANCH_NAME\s*=\s*'([^']+)'/);
    if (prevBranch && !currBranch) {
      criticalChanges.push(`FILTER LOST: branch_name = '${prevBranch[1]}'`);
    }

    // Check for date filter losses
    const prevDateFilter = prev.match(/(SALE_DATE|DATE|CREATED_AT)\s*[><=]+\s*[^AND\s]+/i);
    const currDateFilter = curr.match(/(SALE_DATE|DATE|CREATED_AT)\s*[><=]+\s*[^AND\s]+/i);
    if (prevDateFilter && !currDateFilter) {
      criticalChanges.push(`FILTER LOST: date filter was removed`);
    }

    const unifiedDiff = diffLines.join('\n');
    const changeCount = diffLines.filter(l => l.startsWith('-') || l.startsWith('+')).length;
    const summary = `${changeCount} line(s) changed${criticalChanges.length > 0 ? ` - ${criticalChanges.length} CRITICAL` : ''}`;

    return {
      previous: previousQuery,
      current: currentQuery,
      unifiedDiff,
      criticalChanges,
      summary
    };
  }

  /**
   * Extract a SQL clause between two keywords
   */
  private static extractClause(
    query: string,
    startKeyword: string,
    endKeyword: string | null
  ): string | null {
    const startIdx = query.indexOf(startKeyword);
    if (startIdx === -1) return null;

    const start = startIdx + startKeyword.length;
    const end = endKeyword ? query.indexOf(endKeyword, start) : query.length;
    
    if (endKeyword && end === -1) {
      return query.substring(start).trim();
    }

    return query.substring(start, end === -1 ? query.length : end).trim();
  }

  /**
   * Split clause into logical parts for detailed diffing
   */
  private static splitClauseParts(clause: string, clauseType: string): string[] {
    if (clauseType === 'WHERE') {
      // Split on AND/OR but keep the operators with their conditions
      return clause
        .split(/\s+AND\s+|\s+OR\s+/i)
        .map(part => part.trim())
        .filter(part => part.length > 0);
    } else if (clauseType === 'SELECT') {
      // Split on commas
      return clause
        .split(',')
        .map(part => part.trim())
        .filter(part => part.length > 0);
    } else if (clauseType === 'GROUP BY' || clauseType === 'ORDER BY') {
      // Split on commas
      return clause
        .split(',')
        .map(part => part.trim())
        .filter(part => part.length > 0);
    }
    return [clause];
  }

  /**
   * Format diff for LLM consumption
   */
  static formatDiff(diff: SQLDiff | null): string {
    if (!diff) {
      return '(First query - no diff available)';
    }

    if (!diff.unifiedDiff) {
      return diff.summary;
    }

    let output = `--- Previous Query\n+++ Current Query\n\n`;
    output += diff.unifiedDiff;
    
    if (diff.criticalChanges.length > 0) {
      output += `\n\n!!! CRITICAL CHANGES !!!\n`;
      output += diff.criticalChanges.map(change => `! ${change}`).join('\n');
    }
    
    output += `\n\n${diff.summary}`;

    return output;
  }
}
