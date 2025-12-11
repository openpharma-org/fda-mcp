# AI Assistant Prompt Enhancement PRD
**Product Requirements Document for FDA MCP Server**

## Executive Summary

Current FDA MCP Server prompts fail when executed by AI assistants (Cursor, Claude Code, etc.) due to lack of explicit instructions and validation guidance. This PRD outlines a phased approach to enhance all prompts with comprehensive execution guidance, error prevention, and validation instructions.

## Problem Statement

### Current Issues
- AI assistants misinterpret prompt syntax, leading to 404 errors and invalid field combinations
- Prompts lack explicit parameter formatting requirements
- No validation guidance results in API calls that bypass MCP server validation
- Missing field reference documentation within prompts
- No standardized error prevention patterns

### Impact
- Poor user experience with failed queries
- Reduced adoption due to execution complexity
- Manual intervention required for prompt corrections
- Inconsistent prompt quality across different use cases

## Success Criteria

### Phase 1 Success Metrics
- 95% reduction in field validation errors for enhanced prompts
- Zero 404 errors due to malformed count parameters
- All enhanced prompts include working copy-paste examples

### Phase 2 Success Metrics
- 100% of prompts include validation steps
- Standardized error prevention across all prompt types
- AI assistants can execute prompts without manual correction

### Phase 3 Success Metrics
- Dynamic field validation within prompts
- Real-time syntax checking guidance
- Comprehensive testing framework for prompt execution

## Requirements

### Functional Requirements

#### FR1: Explicit Execution Instructions
- All prompts must include "EXECUTE EXACTLY" sections
- Copy-paste JSON examples with no ambiguity
- Parameter formatting rules clearly stated
- Search syntax requirements specified

#### FR2: Field Validation Guidance
- Reference to valid field definitions within prompts
- Field type restrictions (single vs. multiple)
- Count parameter constraints documented
- Search term escaping rules provided

#### FR3: Error Prevention Patterns
- Common mistake patterns with ❌/✅ examples
- Validation steps before execution
- Debugging protocol for failed queries
- Fallback strategies for syntax errors

#### FR4: Working Examples Library
- Tested, working JSON examples for each query type
- Company name search patterns
- Complex boolean search examples
- Field-specific query templates

### Technical Requirements

#### TR1: Prompt Structure Standardization
```typescript
interface EnhancedPromptStructure {
  instructionHeader: string;        // IMPORTANT: Execute exactly...
  validationRules: string;          // Field validation rules
  errorPrevention: string;          // Common mistakes to avoid
  workingExamples: string[];        // Copy-paste examples
  executionProtocol: string;        // Step-by-step validation
  fieldReference: string;           // Valid fields list
  debuggingSteps: string;           // Error resolution guide
  promptContent: string;            // Original prompt logic
}
```

#### TR2: Field Validation Integration
- Dynamic field lists from `field-definitions.ts`
- Real-time validation rule generation
- Type-specific field constraints
- API endpoint compatibility checks

#### TR3: Template System
- Reusable instruction templates
- Consistent error prevention patterns
- Standardized validation steps
- Modular prompt components

## Implementation Plan

### Phase 1: Core Enhancement Framework (Weeks 1-2)

#### Week 1: Foundation
1. **Create Prompt Enhancement Template**
   - Design standardized instruction header
   - Build error prevention pattern library
   - Create validation rule templates
   - Establish working example format

2. **Enhance Competitive Intelligence Prompt**
   - Apply full enhancement pattern
   - Add field validation guidance
   - Include working examples
   - Test with AI assistant execution

#### Week 2: Template Validation
1. **Test Enhanced Prompt**
   - Validate with Cursor execution
   - Document failure patterns
   - Refine instruction clarity
   - Optimize example formatting

2. **Create Enhancement Toolkit**
   - Build prompt generation utilities
   - Create field reference generators
   - Establish validation helpers
   - Document enhancement process

### Phase 2: Prompt Library Enhancement (Weeks 3-5)

#### Week 3: Safety & Regulatory Prompts
1. **Drug Safety Prompt Enhancement**
   - Apply enhancement template
   - Add adverse events field guidance
   - Include FAERS-specific examples
   - Test execution validation

2. **Regulatory Intelligence Prompt Enhancement**
   - Submission status field validation
   - Timeline query examples
   - Complex search patterns
   - Approval pathway guidance

#### Week 4: Market Intelligence Prompts
1. **Market Intelligence Prompt Enhancement**
   - Market analysis field guidance
   - Competition query patterns
   - Dosage form search examples
   - Market share calculation guidance

2. **Generic Competition Prompt Enhancement**
   - Reference drug identification
   - Generic manufacturer queries
   - Market entry timeline analysis
   - Competition landscape mapping

#### Week 5: Supply & Monitoring Prompts
1. **Supply Chain Prompt Enhancement**
   - Shortage status field validation
   - Manufacturing location queries
   - Supply disruption analysis
   - Risk assessment patterns

2. **Weekly Monitoring Prompt Enhancement**
   - Date range query syntax
   - Alert threshold configuration
   - Multi-parameter monitoring
   - Trend analysis guidance

### Phase 3: Advanced Features (Weeks 6-8)

#### Week 6: Dynamic Validation
1. **Real-time Field Validation**
   - Dynamic field list generation
   - API endpoint compatibility checks
   - Search syntax validation
   - Parameter constraint verification

2. **Interactive Guidance System**
   - Step-by-step query building
   - Real-time syntax checking
   - Error correction suggestions
   - Execution confidence scoring

#### Week 7: Testing & Quality Assurance
1. **Automated Prompt Testing**
   - AI assistant execution testing
   - Error pattern detection
   - Success rate measurement
   - Performance benchmarking

2. **Quality Assurance Framework**
   - Prompt validation checklist
   - Execution success criteria
   - Error tracking system
   - User feedback collection

#### Week 8: Documentation & Training
1. **Comprehensive Documentation**
   - Prompt enhancement guide
   - AI assistant best practices
   - Troubleshooting manual
   - Field reference documentation

2. **Training Materials**
   - Prompt execution tutorials
   - Common error resolution
   - Advanced query patterns
   - Integration guidelines

## Technical Specifications

### Enhanced Prompt Template

```typescript
export abstract class EnhancedPrompt extends BasePrompt {
  protected buildEnhancedPrompt(
    basePrompt: string,
    validFields: string[],
    examples: WorkingExample[]
  ): string {
    return `
${this.getInstructionHeader()}

${this.getValidationRules(validFields)}

${this.getErrorPrevention()}

${this.getWorkingExamples(examples)}

${this.getExecutionProtocol()}

${this.getFieldReference(validFields)}

${this.getDebuggingSteps()}

${basePrompt}
`;
  }

  private getInstructionHeader(): string {
    return `
IMPORTANT: Execute these queries EXACTLY as specified. Do not modify parameter names, field names, or syntax.

CRITICAL REQUIREMENTS:
- Copy-paste JSON examples without changes
- Validate all fields against FDA definitions before execution
- Test with limit=1 before running full queries
- Follow exact search term escaping rules
`;
  }

  private getValidationRules(validFields: string[]): string {
    return `
FIELD VALIDATION RULES:
- fields_for_general accepts ONE field only (not comma-separated)
- count parameter must use exact field names from validation list
- All search terms with spaces must be quoted: "sponsor_name:\\"Company\\""
- Boolean operators require proper spacing: " AND ", " OR "

VALID COUNT FIELDS: ${this.getValidCountFields().join(', ')}
VALID GENERAL FIELDS (first 10): ${validFields.slice(0, 10).join(', ')}...
`;
  }

  private getErrorPrevention(): string {
    return `
COMMON MISTAKES TO AVOID:
❌ DON'T: "count": "sponsor_name.exact"
✅ DO: "count": "sponsor_name"

❌ DON'T: "fields_for_general": "sponsor_name,openfda.brand_name"
✅ DO: "fields_for_general": "sponsor_name"

❌ DON'T: "search_term": "sponsor_name:Lilly"
✅ DO: "search_term": "sponsor_name:\\"Lilly\\""

❌ DON'T: Skip field validation
✅ DO: Check field exists in field-definitions.ts
`;
  }

  private getExecutionProtocol(): string {
    return `
EXECUTION PROTOCOL:
1. VALIDATE each query against FDA field definitions first
2. TEST with limit=1 if unsure about syntax
3. EXECUTE the full query only after validation passes
4. If any query fails, STOP and review field definitions
5. Reference src/api/field-definitions.ts for valid fields
6. Use exact JSON format from working examples
`;
  }

  private getDebuggingSteps(): string {
    return `
DEBUGGING STEPS FOR FAILURES:
1. "Invalid field" error → Check field exists in getDrugsFDAFields() array
2. "404 Not Found" error → Verify count parameter uses base field name
3. Syntax error → Check search term escaping and boolean operators
4. Empty results → Simplify search term, test with basic drug name
5. Validation error → Reference field-definitions.ts lines 59-112

TESTING APPROACH:
- Start with simple search: "search_term": "aspirin"
- Add complexity incrementally
- Validate each parameter before execution
- Use working examples as templates
`;
  }

  abstract getValidCountFields(): string[];
  abstract getWorkingExamples(examples: WorkingExample[]): string;
}
```

### Working Example Structure

```typescript
interface WorkingExample {
  name: string;
  description: string;
  query: {
    method: string;
    search_term: string;
    search_type: string;
    [key: string]: any;
  };
  expectedFields: string[];
  notes: string;
}

const competitiveIntelExamples: WorkingExample[] = [
  {
    name: "Company Search",
    description: "Find all products by specific sponsor",
    query: {
      method: "lookup_drug",
      search_term: "sponsor_name:\"PFIZER\"",
      search_type: "general",
      limit: 5,
      fields_for_general: "openfda.brand_name"
    },
    expectedFields: ["openfda.brand_name"],
    notes: "Note the escaped quotes around company name"
  },
  // ... more examples
];
```

## Risk Assessment

### High Risk
- **Prompt Complexity Increase**: Enhanced prompts may become too verbose
  - Mitigation: Template-based approach with modular components
  - Success Metric: Prompt length < 2000 characters

### Medium Risk
- **AI Assistant Compatibility**: Different assistants may interpret instructions differently
  - Mitigation: Test with multiple AI platforms (Cursor, Claude Code, GitHub Copilot)
  - Success Metric: 90% success rate across major platforms

### Low Risk
- **Maintenance Overhead**: Keeping field references up-to-date
  - Mitigation: Automated field list generation from source
  - Success Metric: Automated updates with API changes

## Success Metrics

### Quantitative Metrics
- Error rate reduction: >95% decrease in field validation errors
- Execution success rate: >90% first-attempt success
- Time to successful execution: <30 seconds average
- User satisfaction: >4.5/5 rating for prompt clarity

### Qualitative Metrics
- AI assistant execution without manual intervention
- Consistent prompt quality across all use cases
- Reduced support requests for prompt formatting
- Improved user confidence in prompt execution

## Dependencies

### Technical Dependencies
- FDA field definitions in `src/api/field-definitions.ts`
- MCP server validation logic
- Prompt registration system
- AI assistant compatibility

### Resource Dependencies
- Development time: 8 weeks
- Testing resources: Multiple AI platforms
- Documentation effort: Comprehensive guides
- User feedback collection: Beta testing group

## Conclusion

This PRD provides a comprehensive approach to enhancing FDA MCP Server prompts for reliable AI assistant execution. The phased implementation ensures systematic improvement while maintaining backward compatibility and establishing long-term quality standards.

The enhanced prompts will significantly improve user experience, reduce errors, and enable seamless integration with modern AI development workflows.