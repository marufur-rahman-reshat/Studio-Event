/**
 * Google Workspace APIs Integration:
 * - Google Drive API v3
 * - Google Sheets API v4
 * - Google Forms API v1
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

export interface SheetDetails {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface FormDetails {
  formId: string;
  responderUri: string;
  title: string;
  editUri?: string;
}

/* =========================================================================
   1. Google Drive API
   ========================================================================= */

/**
 * List files from the user's Google Drive
 */
export async function listDriveFiles(accessToken: string, query?: string): Promise<DriveFile[]> {
  const qParam = query 
    ? `trashed=false and ${query}` 
    : `trashed=false`;

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,webViewLink,iconLink,createdTime,size)&q=${encodeURIComponent(qParam)}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive list failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new Document / text file in Google Drive for event planning notes
 */
export async function createDriveFile(
  accessToken: string, 
  name: string, 
  content: string = '', 
  mimeType: string = 'text/plain'
): Promise<DriveFile> {
  const metadata = {
    name,
    mimeType,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mimeType }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create file in Google Drive: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a file in Google Drive (Destructive operation - requires user confirmation)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive: ${res.statusText}`);
  }
}

/* =========================================================================
   2. Google Sheets API
   ========================================================================= */

/**
 * Create a new Google Spreadsheet for event budget, guest lists, or ticket logs
 */
export async function createEventSpreadsheet(
  accessToken: string,
  eventTitle: string
): Promise<SheetDetails> {
  const title = `Event Logistics: ${eventTitle}`;
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Attendees & RSVP',
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Attendee Name' } },
                    { userEnteredValue: { stringValue: 'Email' } },
                    { userEnteredValue: { stringValue: 'Ticket Type' } },
                    { userEnteredValue: { stringValue: 'Status' } },
                    { userEnteredValue: { stringValue: 'Registered Date' } },
                  ],
                },
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Sample Guest' } },
                    { userEnteredValue: { stringValue: 'guest@example.com' } },
                    { userEnteredValue: { stringValue: 'VIP Access' } },
                    { userEnteredValue: { stringValue: 'Confirmed' } },
                    { userEnteredValue: { stringValue: new Date().toLocaleDateString() } },
                  ],
                },
              ],
            },
          ],
        },
        {
          properties: {
            title: 'Budget & Expenses',
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Item / Service' } },
                    { userEnteredValue: { stringValue: 'Category' } },
                    { userEnteredValue: { stringValue: 'Estimated Cost ($)' } },
                    { userEnteredValue: { stringValue: 'Actual Cost ($)' } },
                  ],
                },
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Hall Rental' } },
                    { userEnteredValue: { stringValue: 'Venue' } },
                    { userEnteredValue: { numberValue: 2500 } },
                    { userEnteredValue: { numberValue: 2400 } },
                  ],
                },
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Audio & Lighting' } },
                    { userEnteredValue: { stringValue: 'AV Equipment' } },
                    { userEnteredValue: { numberValue: 1200 } },
                    { userEnteredValue: { numberValue: 1150 } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Sheet: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    title: data.properties.title,
  };
}

/**
 * Append an attendee row to the Google Spreadsheet
 */
export async function appendSpreadsheetRow(
  accessToken: string,
  spreadsheetId: string,
  rowValues: (string | number)[]
): Promise<void> {
  const range = 'Attendees & RSVP!A:E';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append row to Google Sheet: ${res.statusText}`);
  }
}

/* =========================================================================
   3. Google Forms API
   ========================================================================= */

/**
 * Create a new Google Form for event feedback or attendee RSVP
 */
export async function createEventForm(
  accessToken: string,
  eventTitle: string
): Promise<FormDetails> {
  const title = `${eventTitle} - Registration & Feedback Form`;

  // Step 1: Create empty form
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title,
        documentTitle: title,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Form: ${createRes.statusText}`);
  }

  const createdData = await createRes.json();
  const formId = createdData.formId;

  // Step 2: Add initial survey/RSVP questions via batchUpdate
  const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: 'Will you attend this event in person?',
              description: 'Please confirm your attendance status.',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Yes, attending in person' },
                      { value: 'Yes, joining the virtual live stream' },
                      { value: 'No, unable to attend' },
                    ],
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Dietary preferences or catering restrictions:',
              questionItem: {
                question: {
                  required: false,
                  choiceQuestion: {
                    type: 'CHECKBOX',
                    options: [
                      { value: 'Standard / No restrictions' },
                      { value: 'Vegetarian' },
                      { value: 'Vegan' },
                      { value: 'Gluten-Free' },
                      { value: 'Halal / Kosher' },
                    ],
                  },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Any questions or special requests for the event hosts?',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: true,
                  },
                },
              },
            },
            location: { index: 2 },
          },
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    console.warn('Form created but adding default questions failed:', await updateRes.text());
  }

  return {
    formId,
    responderUri: createdData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
    title: createdData.info?.title || title,
    editUri: `https://docs.google.com/forms/d/${formId}/edit`,
  };
}

/**
 * Fetch responses submitted to a Google Form
 */
export async function getFormResponses(accessToken: string, formId: string): Promise<any[]> {
  const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch form responses: ${res.statusText}`);
  }

  const data = await res.json();
  return data.responses || [];
}
