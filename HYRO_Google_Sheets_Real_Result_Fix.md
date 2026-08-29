# HYRO Automation --- Google Sheets Real Result Fix

## Goal

Make the existing workflow in the screenshot write **real extracted job
data into Google Sheets**.

Current workflow:

``` text
Gmail Trigger
    ↓
AI Classifier
    ↓
AI Detail Extractor
    ↓
Google Sheets Append
```

The workflow must NOT use dummy/mock data. The Google Sheets node must
receive the actual structured output produced by the previous nodes.

------------------------------------------------------------------------

## 1. Required Workflow Behaviour

When the workflow runs:

1.  Gmail Trigger reads emails from the configured Gmail account.
2.  Only emails that are actually job-related should continue.
3.  AI Classifier determines whether the email is a job email.
4.  AI Detail Extractor extracts structured job information.
5.  Google Sheets Append writes one real job record into the configured
    spreadsheet.
6.  The execution result must show the number of rows actually added.

Expected flow:

``` text
Gmail
  ↓
Find matching emails
  ↓
AI Classifier
  ↓
If job-related
  ↓
AI Detail Extractor
  ↓
Validate extracted JSON
  ↓
Google Sheets Append
  ↓
Return inserted row/result
```

If an email is not a job email, it must NOT be inserted into Google
Sheets.

------------------------------------------------------------------------

# 2. Remove Dummy Data

Search the entire workflow/backend/frontend implementation for:

-   dummy job data
-   mock jobs
-   sample jobs
-   hardcoded company names
-   hardcoded job titles
-   fake Gmail messages
-   placeholder Google Sheet rows
-   static `jobs` arrays
-   fallback sample data used as successful output

Do not silently replace failed API responses with dummy data.

For example, this behaviour is NOT acceptable:

``` javascript
if (!jobs.length) {
  return [
    {
      company: "Google",
      role: "Software Engineer"
    }
  ];
}
```

Instead:

``` javascript
if (!jobs.length) {
  return [];
}
```

The UI should clearly report:

``` text
No matching job emails found.
Rows added to Google Sheets: 0
```

------------------------------------------------------------------------

# 3. Google Sheets Integration

The Google Sheets node must use a real Google Sheets API integration.

Required configuration:

``` text
Google Account / OAuth
Spreadsheet ID
Sheet name
Target range
Append operation
```

Do not hardcode a fake spreadsheet ID.

The Spreadsheet ID should be obtained from the configured
integration/node settings.

Example Google Sheets URL:

``` text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

The value between `/d/` and `/edit` is the Spreadsheet ID.

------------------------------------------------------------------------

# 4. Recommended Sheet Columns

Create/use a sheet with these columns:

``` text
Job Title
Company
Location
Job Type
Experience
Salary
Job URL
Source
Email Subject
Email Sender
Received Date
Extracted At
```

The exact columns can be adjusted, but the order must match the values
sent by the Google Sheets Append node.

------------------------------------------------------------------------

# 5. AI Detail Extractor Output

The AI Detail Extractor must return valid JSON.

Use this structure:

``` json
{
  "job_title": "",
  "company": "",
  "location": "",
  "job_type": "",
  "experience": "",
  "salary": "",
  "job_url": "",
  "source": "Gmail",
  "email_subject": "",
  "email_sender": "",
  "received_date": ""
}
```

Important:

-   Return JSON only.
-   Do not return Markdown.
-   Do not wrap JSON inside \`\`\`json fences.
-   Missing values should be `null` or an empty string.
-   Do not invent values that are not present in the email.

------------------------------------------------------------------------

# 6. Pass Real Node Output

The biggest requirement is that the Google Sheets node must consume the
**actual output of AI Detail Extractor**.

Do NOT do this:

``` javascript
const row = {
  job_title: "Software Engineer",
  company: "Google"
};
```

Instead, conceptually:

``` javascript
const extracted = aiDetailExtractor.output;

const row = [
  extracted.job_title,
  extracted.company,
  extracted.location,
  extracted.job_type,
  extracted.experience,
  extracted.salary,
  extracted.job_url,
  extracted.source,
  extracted.email_subject,
  extracted.email_sender,
  extracted.received_date,
  new Date().toISOString()
];
```

The actual implementation should use the project's existing node/output
data model rather than blindly copying this syntax.

------------------------------------------------------------------------

# 7. Google Sheets Append Operation

Use the Google Sheets API append operation.

Conceptually:

``` text
POST Google Sheets API
    ↓
spreadsheets.values.append
    ↓
Spreadsheet ID
    ↓
Sheet name + target range
    ↓
values: [real extracted row]
```

The request should append values to the next available row.

Do not overwrite existing rows unless the workflow explicitly requires
update behaviour.

------------------------------------------------------------------------

# 8. OAuth / Authentication

The Google integration must have a valid authenticated Google account.

Required permission should include Google Sheets access.

If Gmail is also being read through Google OAuth, Gmail access must also
be configured.

Do not put OAuth client secrets, refresh tokens, or access tokens
directly in frontend code.

Use the existing backend/integration credential mechanism.

Frontend:

``` text
Google Sheets connected
```

Backend:

``` text
Use stored OAuth credentials/token
```

Never expose:

``` text
client_secret
refresh_token
access_token
```

to the browser.

------------------------------------------------------------------------

# 9. Backend API Design

The workflow execution backend should perform the Google Sheets append.

Recommended conceptual endpoint:

``` text
POST /api/workflows/:workflowId/run
```

The execution should:

1.  Load workflow.
2.  Execute Gmail Trigger.
3.  Execute Classifier.
4.  Execute Extractor.
5.  Validate extracted data.
6.  Append to Google Sheets.
7.  Return execution details.

Example response:

``` json
{
  "success": true,
  "emailsScanned": 10,
  "matchingEmails": 3,
  "jobsExtracted": 3,
  "rowsAdded": 3,
  "results": [
    {
      "rowNumber": 2,
      "company": "Example Company",
      "jobTitle": "Software Engineer"
    }
  ]
}
```

If no job emails are found:

``` json
{
  "success": true,
  "emailsScanned": 10,
  "matchingEmails": 0,
  "jobsExtracted": 0,
  "rowsAdded": 0
}
```

------------------------------------------------------------------------

# 10. Execution Status Must Be Real

The green success banner in the UI currently shows values such as:

``` text
Emails scanned: 0
Job emails found: 0
Jobs extracted: 0
Rows added to Google Sheets: 0
```

These values must come from the actual backend execution result.

Do NOT hardcode:

``` javascript
emailsScanned: 0
jobsExtracted: 0
rowsAdded: 0
```

unless those are genuinely the results.

The frontend should render:

``` text
Emails scanned: {execution.emailsScanned}
Job emails found: {execution.matchingEmails}
Jobs extracted: {execution.jobsExtracted}
Rows added to Google Sheets: {execution.rowsAdded}
```

------------------------------------------------------------------------

# 11. Node Execution Data

Every node should return useful execution data.

### Gmail Trigger

``` json
{
  "success": true,
  "emails": [],
  "count": 0
}
```

### AI Classifier

``` json
{
  "is_job_email": true,
  "confidence": 0.95
}
```

### AI Detail Extractor

``` json
{
  "job_title": "Software Engineer",
  "company": "Example Company",
  "location": "Chennai",
  "job_type": "Full-time",
  "experience": "0-2 years",
  "salary": null,
  "job_url": "https://example.com/job/123",
  "source": "Gmail",
  "email_subject": "Software Engineer Job Opportunity",
  "email_sender": "jobs@example.com",
  "received_date": "2026-08-29"
}
```

### Google Sheets Append

``` json
{
  "success": true,
  "spreadsheetId": "real-spreadsheet-id",
  "sheetName": "Jobs",
  "rowNumber": 2,
  "updatedCells": 12
}
```

------------------------------------------------------------------------

# 12. Validation Before Google Sheets

Before calling Google Sheets, validate the extracted object.

Minimum validation:

``` text
job_title OR company must exist
```

Recommended:

``` javascript
if (!extracted || typeof extracted !== "object") {
  throw new Error("AI Detail Extractor returned invalid data");
}
```

Do not append an empty row.

If extraction fails:

``` text
Extractor failed → Google Sheets Append must NOT execute
```

------------------------------------------------------------------------

# 13. Error Handling

The workflow must distinguish between:

### No jobs found

``` text
Workflow completed
No matching job emails found
Rows added: 0
```

### Google authentication failure

``` text
Workflow failed
Google authentication is required
```

### Spreadsheet not found

``` text
Workflow failed
Configured spreadsheet could not be accessed
```

### Permission denied

``` text
Workflow failed
Google account does not have permission to edit this spreadsheet
```

### Invalid extractor output

``` text
Workflow failed
AI Detail Extractor returned invalid structured data
```

Never show:

``` text
Workflow Completed Successfully
```

when the Google Sheets API actually failed.

------------------------------------------------------------------------

# 14. Prevent Duplicate Rows

The same Gmail message should not create duplicate rows every time the
workflow runs.

Store a unique identifier such as:

``` text
Gmail Message ID
```

Add this as an internal field or an additional sheet column if needed.

Before appending:

``` text
Does this Gmail message ID already exist?
    ↓
YES → Skip
NO  → Append
```

This prevents duplicate job records.

------------------------------------------------------------------------

# 15. Testing Procedure

After implementation, test using a real Gmail account and a real Google
Sheet.

### Test 1 --- Job email

Send/receive one genuine job-related email.

Run workflow.

Expected:

``` text
Emails scanned: 1 or more
Job emails found: 1
Jobs extracted: 1
Rows added to Google Sheets: 1
```

Open the Google Sheet and verify the new row.

### Test 2 --- Non-job email

Use a normal promotional/personal email.

Expected:

``` text
Job emails found: 0
Rows added: 0
```

No row should be inserted.

### Test 3 --- Multiple job emails

Use 2--3 job emails.

Expected:

``` text
Jobs extracted: 2–3
Rows added: 2–3
```

### Test 4 --- Duplicate execution

Run the same workflow again without receiving a new email.

Expected:

``` text
Rows added: 0
```

The same email must not create another row.

### Test 5 --- Google Sheets failure

Temporarily use an invalid spreadsheet configuration.

Expected:

``` text
Workflow Failed
```

Not:

``` text
Workflow Completed Successfully
```

------------------------------------------------------------------------

# 16. Important Implementation Rule

The complete data path must be:

``` text
REAL GMAIL EMAIL
      ↓
REAL GMAIL MESSAGE DATA
      ↓
REAL AI CLASSIFICATION
      ↓
REAL AI EXTRACTION
      ↓
REAL STRUCTURED JSON
      ↓
REAL GOOGLE SHEETS API
      ↓
REAL GOOGLE SHEET ROW
      ↓
REAL EXECUTION RESULT
      ↓
REAL UI STATUS
```

There must be no fake data anywhere in this path.

------------------------------------------------------------------------

# 17. Definition of Done

The implementation is complete only when all of these are true:

-   [ ] Gmail Trigger reads real emails.
-   [ ] Job classification uses actual email content.
-   [ ] AI Detail Extractor returns valid structured JSON.
-   [ ] Extracted JSON is passed to Google Sheets node.
-   [ ] Google OAuth authentication works.
-   [ ] Real Spreadsheet ID is configurable.
-   [ ] Real Sheet name is configurable.
-   [ ] Google Sheets Append API is called from the backend.
-   [ ] A real row appears in the Google Sheet.
-   [ ] UI shows the actual number of rows added.
-   [ ] No dummy/mock job data is used.
-   [ ] Failed Google API calls show workflow failure.
-   [ ] Empty extraction does not create empty rows.
-   [ ] Duplicate Gmail messages are prevented.
-   [ ] Execution details show each node's real result.

------------------------------------------------------------------------

# 18. Antigravity Implementation Instruction

**Implement this end-to-end in the existing HYRO Automation project. Do
not create a fake/demo implementation. Inspect the current workflow
engine, node execution logic, Google integration, OAuth/credential
handling, and frontend execution-status code before changing anything.
Reuse the existing architecture wherever possible.**

**The final acceptance test is simple:**

> I should be able to click **Run Workflow**, have the workflow read a
> real Gmail job email, classify it, extract the job details, append
> those details as a new row in my real Google Sheet, and see the
> correct `Rows added to Google Sheets` count in the UI.

If any integration is not configured, show the exact configuration error
instead of generating dummy data.
