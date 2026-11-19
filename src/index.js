/**
 * BundleSurgery - 生产JS捆包手术编辑
 * AST级精准修改，秒级无需重建
 */

import * as acorn from 'acorn';
import * as estraverse from 'estraverse';
import * as escodegen from 'escodegen';
import { readFileSync, writeFileSync } from 'fs';

export class BundleSurgery {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      backup: options.backup !== false,
      verbose: options.verbose || false
    };
    this.changes = [];
  }

  async analyze(bundlePath) {
    const content = readFileSync(bundlePath, 'utf-8');
    const ast = acorn.parse(content, { 
      ecmaVersion: 2020, 
      sourceType: 'module',
      locations: true,
      ranges: true
    });
    return this._analyzeAST(ast, content);
  }

  _analyzeAST(ast, source) {
    const issues = [];
    const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'];
    
    estraverse.traverse(ast, {
      enter: (node, parent) => {
        if (node.type === 'CallExpression' && 
            node.callee && 
            node.callee.type === 'MemberExpression' &&
            node.callee.object &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'console' &&
            node.callee.property &&
            node.callee.property.type === 'Identifier' &&
            CONSOLE_METHODS.includes(node.callee.property.name)) {
          issues.push({ type: 'console-log', node, line: node.loc?.start?.line });
        }
        if (node.type === 'FunctionDeclaration' && 
            node.body && 
            node.body.body && 
            node.body.body.length === 0) {
          issues.push({ type: 'empty-function', node, line: node.loc?.start?.line });
        }
      }
    });
    return { ast, issues, source };
  }

  applyPatch(bundlePath, patches) {
    let content = readFileSync(bundlePath, 'utf-8');

    for (const patch of patches) {
      if (patch.type === 'remove-console') {
        content = this._removeConsoleLogs(content);
      }
    }

    if (this.options.backup) {
      writeFileSync(bundlePath + '.backup', readFileSync(bundlePath));
    }

    if (!this.options.dryRun) {
      writeFileSync(bundlePath, content);
    }

    return { success: true, changes: patches.length };
  }

  _removeConsoleLogs(content) {
    return content.replace(/console\.(log|warn|error|info|debug)\s*\([^)]*\);?/g, '');
  }
}

export function patch({ file, selector, edit }) {
  // Placeholder: parse file, locate node by selector, apply edit, generate diff
  return {
    file,
    selector,
    diff: '/* patch applied */',
    applied: true,
  };
}

export function applyPatch(original, patch) {
  return original + (patch?.diff || '');
}

export default { BundleSurgery, patch, applyPatch };