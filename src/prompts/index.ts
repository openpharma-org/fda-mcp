/**
 * Prompt registry and management for FDA MCP Server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BasePrompt } from './base.js';
import { DrugSafetyPrompt } from './drug-safety.js';
import { CompetitiveIntelPrompt } from './competitive-intel.js';
import { GenericCompetitionPrompt } from './generic-competition.js';
import { SupplyChainPrompt } from './supply-chain.js';
import { RegulatoryIntelPrompt } from './regulatory-intel.js';
import { WeeklyMonitoringPrompt } from './weekly-monitoring.js';
import { MarketIntelPrompt } from './market-intel.js';
import { logger } from '../logging/index.js';

export interface PromptRegistry {
  prompts: Map<string, BasePrompt<any>>;
  register(prompt: BasePrompt<any>): void;
  registerAll(server: McpServer): void;
  get(name: string): BasePrompt | undefined;
  list(): BasePrompt[];
  clearCaches(requestId?: string): void;
}

export class FdaPromptRegistry implements PromptRegistry {
  public prompts: Map<string, BasePrompt<any>>;

  constructor() {
    this.prompts = new Map();
    this.initializePrompts();
  }

  private initializePrompts(): void {
    // Register all available prompts
    const drugSafetyPrompt = new DrugSafetyPrompt();
    const competitiveIntelPrompt = new CompetitiveIntelPrompt();
    const genericCompetitionPrompt = new GenericCompetitionPrompt();
    const supplyChainPrompt = new SupplyChainPrompt();
    const regulatoryIntelPrompt = new RegulatoryIntelPrompt();
    const weeklyMonitoringPrompt = new WeeklyMonitoringPrompt();
    const marketIntelPrompt = new MarketIntelPrompt();

    this.register(drugSafetyPrompt as BasePrompt<any>);
    this.register(competitiveIntelPrompt as BasePrompt<any>);
    this.register(genericCompetitionPrompt as BasePrompt<any>);
    this.register(supplyChainPrompt as BasePrompt<any>);
    this.register(regulatoryIntelPrompt as BasePrompt<any>);
    this.register(weeklyMonitoringPrompt as BasePrompt<any>);
    this.register(marketIntelPrompt as BasePrompt<any>);

    logger.info('Prompt registry initialized', {
      promptCount: this.prompts.size,
      prompts: Array.from(this.prompts.keys())
    }, {
      component: 'PROMPT_REGISTRY'
    });
  }

  public register(prompt: BasePrompt<any>): void {
    const promptName = prompt.getName();

    if (this.prompts.has(promptName)) {
      logger.warn(`Prompt ${promptName} is already registered, overwriting`, {
        promptName
      }, {
        component: 'PROMPT_REGISTRY'
      });
    }

    this.prompts.set(promptName, prompt);

    logger.debug('Prompt registered', {
      promptName,
      description: prompt.getDescription()
    }, {
      component: 'PROMPT_REGISTRY'
    });
  }

  public registerAll(server: McpServer): void {
    const registeredPrompts: string[] = [];
    const failedPrompts: string[] = [];

    for (const [name, prompt] of this.prompts) {
      try {
        prompt.register(server);
        registeredPrompts.push(name);

        logger.debug('Prompt registered with MCP server', {
          promptName: name
        }, {
          component: 'PROMPT_REGISTRY'
        });
      } catch (error) {
        failedPrompts.push(name);

        logger.error(`Failed to register prompt ${name}`, error as Error, {
          component: 'PROMPT_REGISTRY',
          operation: 'registerAll'
        });
      }
    }

    logger.info('Prompts registration completed', {
      registered: registeredPrompts,
      failed: failedPrompts,
      totalCount: this.prompts.size
    }, {
      component: 'PROMPT_REGISTRY'
    });

    if (failedPrompts.length > 0) {
      throw new Error(`Failed to register prompts: ${failedPrompts.join(', ')}`);
    }
  }

  public get(name: string): BasePrompt | undefined {
    return this.prompts.get(name);
  }

  public list(): BasePrompt[] {
    return Array.from(this.prompts.values());
  }

  public clearCaches(requestId?: string): void {
    let clearedCount = 0;

    for (const [name, prompt] of this.prompts) {
      try {
        // Clear cache if prompt supports it
        if ('clearCache' in prompt && typeof prompt.clearCache === 'function') {
          (prompt as any).clearCache(requestId);
          clearedCount++;
        }
      } catch (error) {
        logger.error(`Failed to clear cache for prompt ${name}`, error as Error, {
          component: 'PROMPT_REGISTRY',
          requestId,
          operation: 'clearCaches'
        });
      }
    }

    logger.info('Prompt caches cleared', {
      clearedCount,
      totalPrompts: this.prompts.size
    }, {
      component: 'PROMPT_REGISTRY',
      requestId
    });
  }

  public dispose(): void {
    // Clean up resources
    for (const [name, prompt] of this.prompts) {
      try {
        // Call dispose if prompt supports it
        if ('dispose' in prompt && typeof prompt.dispose === 'function') {
          (prompt as any).dispose();
        }
      } catch (error) {
        logger.error(`Failed to dispose prompt ${name}`, error as Error, {
          component: 'PROMPT_REGISTRY',
          operation: 'dispose'
        });
      }
    }

    this.prompts.clear();

    logger.info('Prompt registry disposed', {}, {
      component: 'PROMPT_REGISTRY'
    });
  }
}

// Create singleton instance
export const promptRegistry = new FdaPromptRegistry();

// Export prompt classes for direct use
export { DrugSafetyPrompt } from './drug-safety.js';
export { CompetitiveIntelPrompt } from './competitive-intel.js';
export { GenericCompetitionPrompt } from './generic-competition.js';
export { SupplyChainPrompt } from './supply-chain.js';
export { RegulatoryIntelPrompt } from './regulatory-intel.js';
export { WeeklyMonitoringPrompt } from './weekly-monitoring.js';
export { MarketIntelPrompt } from './market-intel.js';
export { BasePrompt } from './base.js';

// Utility functions
export function createPromptRegistry(): FdaPromptRegistry {
  return new FdaPromptRegistry();
}

export async function registerDefaultPrompts(server: McpServer): Promise<void> {
  try {
    // Import settings manager (done here to avoid circular dependencies)
    const { settingsManager } = await import('../config/settings.js');
    const settings = settingsManager.getSettings();

    if (!settings.features.prompts.enabled) {
      logger.info('Prompts are disabled in configuration', {}, {
        component: 'PROMPT_REGISTRY'
      });
      return;
    }

    const enabledPrompts = settingsManager.getEnabledPrompts();
    logger.info('Registering enabled prompts', {
      enabledPrompts: enabledPrompts,
      totalAvailable: promptRegistry.prompts.size
    }, {
      component: 'PROMPT_REGISTRY'
    });

    // Create a temporary registry with only enabled prompts
    const tempRegistry = new FdaPromptRegistry();
    tempRegistry.prompts.clear(); // Clear all prompts

    // Register only enabled prompts
    for (const [name, prompt] of promptRegistry.prompts) {
      if (enabledPrompts.includes(name)) {
        tempRegistry.register(prompt);
      }
    }

    // Register the filtered prompts with the server
    tempRegistry.registerAll(server);
  } catch (error) {
    logger.error('Failed to load settings for prompts, registering all prompts', error as Error, {
      component: 'PROMPT_REGISTRY'
    });
    promptRegistry.registerAll(server);
  }
}