# ci-reports

Machine-written branch backing the Tuples reports dashboard (/tuples/reports/).
Each CI run appends a record to data/index.json and granular details under
data/runs/<id>/. Entries older than 183 days are pruned automatically.
