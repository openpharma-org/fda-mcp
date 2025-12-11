// Modern prompt registrations using registerPrompt()
server.registerPrompt(
  'drug_safety_analysis',
  {
    title: 'Drug Safety Analysis',
    description: 'Comprehensive drug safety analysis using FDA adverse events data (FAERS database). Analyzes safety profile with total reports, top reactions, serious events by demographics, and age patterns for deaths.',
    argsSchema: {
      drug_name: {
        type: 'string',
        description: 'Name of the drug to analyze (generic or brand name)',
        required: true
      }
    }
  },
  ({ drug_name }) => {
    const prompt = `Analyze the safety profile for ${drug_name} using FDA adverse events data with these optimized queries:

1. Total reports with reaction data:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "field_exists": "patient.reaction.reactionmeddrapt",
       "limit": 1
     }

2. Top adverse reactions (count statistics):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\"",
       "search_type": "adverse_events",
       "count": "patient.reaction.reactionmeddrapt.exact",
       "limit": 10
     }

3. Gender distribution of serious events:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1",
       "search_type": "adverse_events",
       "count": "patient.patientsex",
       "limit": 5
     }

4. Age patterns in death outcomes:
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND patient.reaction.reactionoutcome:5",
       "search_type": "adverse_events",
       "field_exists": "patient.patientonsetage",
       "limit": 20
     }

5. Recent serious events (last 2 years):
   - Tool: fda_info
   - Parameters: {
       "method": "lookup_drug",
       "search_term": "patient.drug.medicinalproduct:\\"${drug_name}\\" AND serious:1 AND receivedate:[20220101+TO+*]",
       "search_type": "adverse_events",
       "limit": 15
     }

Execute each query sequentially and provide a comprehensive safety analysis covering:
- Overall safety profile with total adverse event reports
- Most frequently reported adverse reactions and their significance
- Demographic patterns in serious adverse events
- Age-related patterns in fatal outcomes
- Recent trends in serious adverse events

Present findings with clinical context and statistical interpretation for pharmaceutical safety assessment.`;

    return {
      description: `Drug safety analysis for ${drug_name}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ]
    };
  }
);

// Additional prompts would follow the same pattern...