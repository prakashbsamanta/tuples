*Create a file named `CORE_ENGINE_SQL_SCHEMA.json`. Antigravity will ingest this structure to generate your pluggable backend modules[cite: 5,
    6
].*

```json
{
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "title": "TuplesDomainMatrix",
    "description": "Universal architectural blueprint mapping out the 35-step progressive SQL curriculum across pluggable domains.",
    "type": "object",
    "properties": {
        "domainId": {
            "type": "string"
        },
        "domainName": {
            "type": "string"
        },
        "domainDescription": {
            "type": "string"
        },
        "curriculumMatrix": {
            "type": "array",
            "minItems": 35,
            "maxItems": 35,
            "items": {
                "type": "object",
                "required": [
                    "stepIndex",
                    "phase",
                    "conceptFocus",
                    "narrativeBriefing",
                    "hints",
                    "validationType",
                    "verificationQuery"
                ],
                "properties": {
                    "stepIndex": {
                        "type": "integer"
                    },
                    "phase": {
                        "type": "string",
                        "enum": [
                            "Novice",
                            "Operator",
                            "Architect"
                        ]
                    },
                    "conceptFocus": {
                        "type": "string"
                    },
                    "narrativeBriefing": {
                        "type": "string"
                    },
                    "hints": {
                        "type": "object",
                        "required": [
                            "tier1Concept",
                            "tier2Scaffold",
                            "tier3Solution"
                        ],
                        "properties": {
                            "tier1Concept": {
                                "type": "string"
                            },
                            "tier2Scaffold": {
                                "type": "string"
                            },
                            "tier3Solution": {
                                "type": "string"
                            }
                        }
                    },
                    "validationType": {
                        "type": "string",
                        "enum": [
                            "OUTPUT_MATCH",
                            "SCHEMA_VERIFY",
                            "ROW_COUNT_VERIFY"
                        ]
                    },
                    "verificationQuery": {
                        "type": "string"
                    },
                    "expectedResult": {
                        "type": "string"
                    }
                }
            }
        }
    },
    "examples": [
        {
            "domainId": "clinical-trials-research",
            "domainName": "Clinical Trials Tracking & Analytics Platform",
            "domainDescription": "Build an enterprise medical research database backend to securely manage patient registries, tracking logs, dosage configurations, and adverse reactions.",
            "curriculumMatrix": [
                {
                    "stepIndex": 1,
                    "phase": "Novice",
                    "conceptFocus": "CREATE_TABLE",
                    "narrativeBriefing": "Welcome to the Core Research Lab. We need to initialize our clinical trial tracking system from absolute scratch. Begin by building the foundational entity storage: create a primary table named `patients` that contains an explicit identifier column (`patient_id` as an integer) and a textual column (`patient_name`).",
                    "hints": {
                        "tier1Concept": "Use the CREATE TABLE command to initialize a new table asset. Define explicit types for each attribute inside parentheses.",
                        "tier2Scaffold": "CREATE TABLE patients (\n  patient_id INT,\n  patient_name TEXT\n);",
                        "tier3Solution": "CREATE TABLE patients (patient_id INT, patient_name TEXT);"
                    },
                    "validationType": "SCHEMA_VERIFY",
                    "verificationQuery": "SELECT name FROM sqlite_master WHERE type='table' AND name='patients';",
                    "expectedResult": "[{\"name\":\"patients\"}]"
                },
                {
                    "stepIndex": 12,
                    "phase": "Operator",
                    "conceptFocus": "DESTRUCTIVE_DELETE_WHERE",
                    "narrativeBriefing": "An operational audit reveals that a batch of electronic logs contains corrupted data points. For instance, patient record entries matching IDs below 105 were entered during a faulty telemetry scan. Execute a destructive delete command to permanently remove any patient entries from the `patients` index whose ID metrics are less than 105.",
                    "hints": {
                        "tier1Concept": "Utilize the DELETE FROM statement paired with a standard filter clause to safely target only the corrupted database records.",
                        "tier2Scaffold": "DELETE FROM patients WHERE patient_id < ___;",
                        "tier3Solution": "DELETE FROM patients WHERE patient_id < 105;"
                    },
                    "validationType": "ROW_COUNT_VERIFY",
                    "verificationQuery": "SELECT COUNT(*) as count FROM patients WHERE patient_id < 105;",
                    "expectedResult": "[{\"count\":0}]"
                },
                {
                    "stepIndex": 28,
                    "phase": "Architect",
                    "conceptFocus": "WINDOW_PARTITION_BY",
                    "narrativeBriefing": "Excellent database construction. We are now performing advanced statistical processing. Write an analytical query using window calculations to display every entry from the `dosage_logs` table. Include an adjacent analytical column named `running_total_dosage` that computes the running summation of `mg_administered` partitioned distinctively by each unique `patient_id` and sorted chronologically by `log_timestamp`.",
                    "hints": {
                        "tier1Concept": "Apply the SUM() aggregate function as an analytical window asset utilizing the OVER clause along with separate PARTITION BY and ORDER BY arguments.",
                        "tier2Scaffold": "SELECT patient_id, mg_administered, SUM(mg_administered) OVER (PARTITION BY ___ ORDER BY ___) AS running_total_dosage FROM dosage_logs;",
                        "tier3Solution": "SELECT patient_id, mg_administered, SUM(mg_administered) OVER (PARTITION BY patient_id ORDER BY log_timestamp) AS running_total_dosage FROM dosage_logs;"
                    },
                    "validationType": "OUTPUT_MATCH",
                    "verificationQuery": "SELECT patient_id, mg_administered, SUM(mg_administered) OVER (PARTITION BY patient_id ORDER BY log_timestamp) AS running_total_dosage FROM dosage_logs LIMIT 1;",
                    "expectedResult": "[{\"patient_id\":105,\"mg_administered\":50,\"running_total_dosage\":50}]"
                }
            ]
        }
    ]
}