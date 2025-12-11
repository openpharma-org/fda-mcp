# FDA MCP Server Refactoring PRD

## Executive Summary

This PRD outlines the comprehensive refactoring of the FDA MCP Server from a monolithic 718-line `index.js` file to a modern, modular architecture based on the proven patterns from the Cortellis MCP Server.

## Current State Analysis

### Issues with Current Architecture
- **Monolithic Design**: Single 718-line file with mixed concerns
- **No Separation of Concerns**: Tools, prompts, server logic, and schemas all in one file
- **Poor Maintainability**: Difficult to add new features or modify existing ones
- **No Error Handling**: Basic try-catch with no structured error management
- **No Configuration Management**: Hardcoded values and no environment-based config
- **No Logging**: Basic stderr writes with no structured logging
- **No Testing Infrastructure**: No modular design for unit testing
- **Inconsistent Code Organization**: Tools and prompts mixed together

### Current File Structure
```
src/
├── index.js (718 lines - everything)
├── fda-search.js (API logic)
└── [no other structure]
```

## Target Architecture

Based on the proven Cortellis MCP Server architecture, implement a modular design with clear separation of concerns.

### Proposed Directory Structure
```
src/
├── api/                    # FDA API client modules
│   ├── client.ts          # FDA openFDA API client
│   ├── endpoints.ts       # API endpoint definitions
│   └── index.ts          # API module exports
├── config/                # Configuration management
│   ├── index.ts          # Configuration manager
│   └── validation.ts     # Config validation schemas
├── errors/                # Error handling and formatting
│   ├── index.ts          # Error types and handlers
│   └── fdaErrors.ts      # FDA-specific error types
├── logging/               # Logging and monitoring
│   ├── index.ts          # Logger and performance monitor
│   └── requestTracker.ts # Request tracking for debugging
├── servers/               # Server implementations
│   ├── mcp.ts            # MCP server implementation
│   └── index.ts          # Server exports
├── tools/                 # MCP tools (1 file per tool)
│   ├── base.ts           # Base tool class
│   ├── fdaInfo.ts        # FDA info tool implementation
│   └── index.ts          # Tools factory and exports
├── prompts/               # MCP prompts (1 file per prompt)
│   ├── base.ts           # Base prompt class with hybrid registration
│   ├── drugSafety.ts     # Drug safety analysis prompt
│   ├── competitiveIntel.ts # Pharmaceutical competitive intelligence
│   ├── genericCompetition.ts # Generic competition assessment
│   ├── supplyChain.ts    # Supply chain intelligence
│   ├── regulatory.ts     # FDA regulatory intelligence
│   ├── monitoring.ts     # Weekly regulatory monitoring
│   ├── marketIntel.ts    # FDA market intelligence
│   └── index.ts          # Prompts factory with dual API support
├── compatibility/         # Client compatibility layer
│   ├── legacy.ts         # Legacy MCP client support (setRequestHandler)
│   ├── modern.ts         # Modern MCP client support (registerPrompt)
│   └── index.ts          # Automatic client detection and routing
├── types/                 # TypeScript type definitions
│   ├── index.ts          # Common types
│   ├── fda.ts            # FDA API response types
│   └── schemas.ts        # Zod validation schemas
├── utils/                 # Utility functions
│   ├── index.ts          # Utility exports
│   └── validation.ts     # Common validation helpers
└── index.ts              # Main entry point
```

## Implementation Plan

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Project Structure Setup
- [ ] Create modular directory structure
- [ ] Add TypeScript configuration
- [ ] Setup build pipeline with proper TypeScript compilation
- [ ] Update package.json with new dependencies

#### 1.2 Base Classes and Interfaces
- [ ] Create `BaseTool` abstract class
- [ ] Create `BasePrompt` abstract class
- [ ] Define core TypeScript interfaces
- [ ] Setup Zod schemas for validation

#### 1.3 Configuration Management
- [ ] Create `ConfigManager` class
- [ ] Environment variable validation
- [ ] Configuration type definitions
- [ ] Default configuration setup

### Phase 2: Core Services (Week 2)

#### 2.1 Logging System
- [ ] Implement structured logging with levels
- [ ] Request ID tracking
- [ ] Performance monitoring
- [ ] Error logging with context

#### 2.2 Error Handling
- [ ] Create error hierarchy
- [ ] FDA-specific error types
- [ ] Error response formatting
- [ ] Error recovery strategies

#### 2.3 API Client Refactoring
- [ ] Extract `fda-search.js` functionality into `api/client.ts`
- [ ] Create typed API client
- [ ] Add retry logic and rate limiting
- [ ] Implement proper error handling

### Phase 3: Tools Migration (Week 3)

#### 3.1 Tool Base Class
```typescript
export abstract class BaseTool {
  protected apiClient: FdaApiClient;
  protected logger: Logger;

  constructor(apiClient: FdaApiClient, logger: Logger) {
    this.apiClient = apiClient;
    this.logger = logger;
  }

  abstract getToolDefinition(): Tool;
  abstract execute(params: Record<string, any>): Promise<ServerResult>;
  abstract validateParams(params: unknown): void;
}
```

#### 3.2 FDA Info Tool Implementation
- [ ] Create `FdaInfoTool` class extending `BaseTool`
- [ ] Implement all current functionality from monolithic file
- [ ] Add proper parameter validation with Zod
- [ ] Add comprehensive error handling

### Phase 4: Prompts Migration (Week 4) - **UPDATED: Hybrid Approach**

#### 4.1 Hybrid Prompt Base Class
```typescript
export abstract class BasePrompt {
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Modern API registration
  abstract registerModern(server: McpServer): void;

  // Legacy API registration
  abstract registerLegacy(server: any): void;

  // Dual registration method
  register(server: McpServer): void {
    this.registerModern(server);
    this.registerLegacy(this.getUnderlyingServer(server));
  }

  private getUnderlyingServer(server: McpServer): any {
    return server._server || server.server || server;
  }

  abstract getName(): string;
  abstract getDescription(): string;
  abstract getArgsSchema(): Record<string, ZodSchema>;
  abstract execute(args: Record<string, any>): Promise<PromptResult>;
}
```

#### 4.2 Individual Prompt Classes with Dual Registration
- [x] ✅ `DrugSafetyPrompt` - Drug safety analysis *(implemented in hybrid solution)*
- [x] ✅ `CompetitiveIntelPrompt` - Pharmaceutical competitive intelligence *(implemented in hybrid solution)*
- [x] ✅ `GenericCompetitionPrompt` - Generic competition assessment *(implemented in hybrid solution)*
- [x] ✅ `SupplyChainPrompt` - Supply chain intelligence *(implemented in hybrid solution)*
- [x] ✅ `RegulatoryPrompt` - FDA regulatory intelligence *(implemented in hybrid solution)*
- [x] ✅ `MonitoringPrompt` - Weekly regulatory monitoring *(implemented in hybrid solution)*
- [x] ✅ `MarketIntelPrompt` - FDA market intelligence *(implemented in hybrid solution)*

#### 4.3 Client Compatibility Layer
- [ ] `LegacyClientAdapter` - Handles `setRequestHandler` approach for current Claude clients
- [ ] `ModernClientAdapter` - Handles `registerPrompt` approach for future clients
- [ ] `ClientDetector` - Automatically detects which approach to use

### Phase 5: Server Refactoring (Week 5)

#### 5.1 MCP Server Implementation
```typescript
export class FdaMcpServer {
  private server: McpServer;
  private apiClient: FdaApiClient;
  private tools: Record<string, BaseTool>;
  private prompts: Record<string, BasePrompt>;
  private logger: Logger;
  private config: ConfigManager;

  constructor(config?: ConfigManager) {
    // Initialize all components
  }

  private setupTools(): void {
    // Register all tools using server.tool()
  }

  private setupPrompts(): void {
    // Register all prompts using server.registerPrompt()
  }

  async start(): Promise<void> {
    // Start server with stdio transport
  }
}
```

#### 5.2 Factory Functions
- [ ] `createTools()` factory function
- [ ] `createPrompts()` factory function
- [ ] Dependency injection setup

### Phase 6: Testing & Quality (Week 6)

#### 6.1 Unit Testing Setup
- [ ] Jest configuration for TypeScript
- [ ] Test utilities and mocks
- [ ] API client unit tests
- [ ] Tool unit tests
- [ ] Prompt unit tests

#### 6.2 Integration Testing
- [ ] End-to-end MCP server tests
- [ ] Tool execution tests
- [ ] Prompt generation tests
- [ ] Error handling tests

#### 6.3 Code Quality
- [ ] ESLint configuration
- [ ] Prettier setup
- [ ] Type checking in CI
- [ ] Code coverage reporting

## Technical Specifications

### 1. Configuration Management
```typescript
interface FdaServerConfig {
  // Server settings
  name: string;
  version: string;

  // API settings
  fdaApiBaseUrl: string;
  requestTimeout: number;
  retryAttempts: number;

  // Logging
  logLevel: LogLevel;
  enableRequestLogging: boolean;

  // Performance
  maxConcurrentRequests: number;
  rateLimitPerMinute: number;
}
```

### 2. Tool Architecture
```typescript
interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
}

interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: ErrorResponse;
  metadata?: {
    executionTime: number;
    requestId: string;
  };
}
```

### 3. Prompt Architecture
```typescript
interface PromptDefinition {
  name: string;
  description: string;
  argsSchema: Record<string, ZodSchema>;
}

interface PromptExecutionResult {
  description: string;
  messages: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
}
```

### 4. Error Handling
```typescript
enum FdaErrorType {
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

interface FdaError extends Error {
  type: FdaErrorType;
  code: string;
  details?: Record<string, any>;
  requestId?: string;
}
```

## Migration Strategy

### Backward Compatibility
- [ ] Maintain exact same API interface during migration
- [ ] Preserve all existing functionality
- [ ] Ensure all 7 prompts work identically
- [ ] Keep same tool name and parameters

### Testing Strategy
- [ ] Create comprehensive test suite before refactoring
- [ ] Test current monolithic implementation
- [ ] Compare outputs during migration
- [ ] Regression testing after each phase

### Rollback Plan
- [ ] Keep current `index.js` as `index.legacy.js`
- [ ] Use feature flags for gradual migration
- [ ] Automated testing to catch regressions
- [ ] Performance benchmarking

## Success Criteria

### Functional Requirements
- [x] ✅ All 7 prompts work identically to current implementation *(achieved with hybrid solution)*
- [x] ✅ FDA info tool maintains exact same functionality *(confirmed working)*
- [x] ✅ No breaking changes to external API *(backward compatible)*
- [x] ✅ Response times remain equivalent or better *(maintained performance)*
- [x] ✅ **BONUS**: Cross-client compatibility (Claude Code + Claude Desktop) *(hybrid approach advantage)*

### Non-Functional Requirements
- [ ] Code maintainability score improvement (70%+ reduction in complexity)
- [ ] Test coverage > 80%
- [ ] Documentation coverage for all modules
- [ ] Build time < 10 seconds
- [ ] TypeScript strict mode compliance

### Quality Metrics
- [ ] Cyclomatic complexity < 10 per function
- [ ] File sizes < 200 lines (except test files)
- [ ] Zero TypeScript compiler errors
- [ ] Zero ESLint errors
- [ ] 100% of functions have JSDoc comments

## Benefits

### Developer Experience
- **Maintainability**: Easy to add new tools and prompts
- **Testability**: Modular design enables comprehensive testing
- **Type Safety**: Full TypeScript implementation
- **Debugging**: Structured logging and error handling
- **Code Reuse**: Base classes reduce boilerplate
- **🆕 Hybrid Compatibility**: Single codebase supports both modern and legacy MCP clients
- **🆕 Future-Proofing**: Ready for MCP client evolution without breaking changes

### Production Benefits
- **Reliability**: Better error handling and recovery
- **Performance**: Optimized API client with caching
- **Monitoring**: Structured logging for production debugging
- **Scalability**: Modular design supports feature growth
- **Security**: Input validation and error sanitization

### Business Benefits
- **Faster Feature Development**: New tools/prompts easier to implement
- **Better User Experience**: More reliable and performant server
- **Reduced Technical Debt**: Modern, maintainable codebase
- **Future Proof**: Architecture supports growth and evolution

## Timeline - **UPDATED with Hybrid Success**

| Phase | Duration | Key Deliverables | Status |
|-------|----------|------------------|---------|
| **Phase 0** | **✅ DONE** | **Hybrid solution: All prompts working in Claude Code/Desktop** | **🎉 COMPLETE** |
| Phase 1 | Week 1 | Project structure, base classes with hybrid support | *Accelerated* |
| Phase 2 | Week 2 | Core services (logging, errors, API) | *On track* |
| Phase 3 | Week 3 | Tools migration with modern patterns | *On track* |
| Phase 4 | Week 4 | Apply hybrid pattern to modular architecture | *Modified* |
| Phase 5 | Week 5 | Server refactoring with compatibility layer | *Enhanced* |
| Phase 6 | Week 6 | Testing & quality + legacy cleanup planning | *Extended scope* |

**Original Duration**: 6 weeks
**Current Status**: ✅ **Working solution delivered immediately** + structured refactoring optional

### Timeline Benefits from Hybrid Approach:
- 🚀 **Immediate Value**: All prompts working now vs waiting 6 weeks
- 🔄 **Incremental Improvement**: Can refactor while maintaining functionality
- 🛡️ **Risk Reduction**: No "big bang" migration needed
- 📈 **Business Impact**: Users can start using prompts immediately

## Risk Mitigation

### Technical Risks
- **Breaking Changes**: Comprehensive testing and backward compatibility
- **Performance Regression**: Benchmarking and optimization
- **Complex Migration**: Gradual migration with rollback capability

### Timeline Risks
- **Scope Creep**: Clear phase boundaries and acceptance criteria
- **Integration Issues**: Early integration testing
- **Testing Delays**: Parallel development of tests and implementation

## Next Steps

1. ✅ **Immediate**: Hybrid solution deployed and working in both Claude Code and Claude Desktop
2. **Optional Refactoring**: Apply hybrid pattern to modular architecture when beneficial
3. **Monitoring**: Track MCP client adoption of modern API
4. **Future Cleanup**: Remove legacy support when clients fully support modern API

This refactoring will transform the FDA MCP Server into a modern, maintainable, and scalable codebase that follows industry best practices and proven architectural patterns, while maintaining compatibility with current MCP clients through a proven hybrid approach.