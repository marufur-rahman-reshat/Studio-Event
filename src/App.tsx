/**
 * Event Management System
 * Integrated with Google Drive, Google Sheets, Google Forms, and Firebase Firestore
 * Styled following W3Schools Web Standards
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleSignIn, 
  logout, 
  initAuth, 
  testFirestoreConnection,
  handleFirestoreError,
  OperationType 
} from './lib/firebase.ts';
import { 
  listDriveFiles, 
  createDriveFile, 
  deleteDriveFile, 
  createEventSpreadsheet, 
  appendSpreadsheetRow,
  createEventForm,
  getFormResponses,
  DriveFile, 
  SheetDetails, 
  FormDetails 
} from './lib/workspace.ts';

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  venue: string;
  capacity: number;
  organizerName: string;
  organizerId: string;
  driveFileId?: string;
  sheetId?: string;
  formId?: string;
}

export default function App() {
  // Authentication & Workspace Token State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'drive' | 'sheets' | 'forms' | 'firestore'>('overview');

  // Firestore status & data
  const [firestoreOnline, setFirestoreOnline] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'Corporate Conference',
    date: '',
    venue: '',
    capacity: 100,
    description: '',
  });

  // Google Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocContent, setNewDocContent] = useState<string>('');
  const [driveFilter, setDriveFilter] = useState<string>('');
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);

  // Google Sheets State
  const [sheetsList, setSheetsList] = useState<SheetDetails[]>([]);
  const [sheetLoading, setSheetLoading] = useState<boolean>(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [attendeeRow, setAttendeeRow] = useState({
    name: '',
    email: '',
    ticketType: 'General Admission',
    status: 'Confirmed',
  });

  // Google Forms State
  const [formsList, setFormsList] = useState<FormDetails[]>([]);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [selectedFormResponses, setSelectedFormResponses] = useState<{ formId: string; responses: any[] } | null>(null);

  // General Notification / Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Setup Auth and Firestore on mount
  useEffect(() => {
    testFirestoreConnection().then(setFirestoreOnline);

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to Firestore events
  useEffect(() => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'));
      const unsubscribeEvents = onSnapshot(
        q,
        (snapshot) => {
          const list: EventItem[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setEvents(list);
        },
        (error) => {
          console.warn('Real-time events sync error:', error.message);
        }
      );
      return () => unsubscribeEvents();
    } catch (e) {
      console.warn('Snapshot listener init notice:', e);
    }
  }, []);

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({ text: `Signed in successfully as ${res.user.displayName || res.user.email}!`, type: 'success' });
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    setStatusMessage({ text: 'You have signed out.', type: 'info' });
  };

  /* ---------------- Google Drive Operations ---------------- */
  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setDriveLoading(true);
    try {
      const files = await listDriveFiles(accessToken, driveFilter ? `name contains '${driveFilter}'` : undefined);
      setDriveFiles(files);
      setStatusMessage({ text: `Retrieved ${files.length} Google Drive files.`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `Google Drive Error: ${err.message}`, type: 'error' });
    } finally {
      setDriveLoading(false);
    }
  };

  const handleCreateDriveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newDocTitle.trim()) return;
    setDriveLoading(true);
    try {
      const newFile = await createDriveFile(
        accessToken, 
        `${newDocTitle.trim()}.txt`, 
        newDocContent || `Event Planning Document\nCreated: ${new Date().toISOString()}`
      );
      setStatusMessage({ text: `File "${newFile.name}" created in Google Drive!`, type: 'success' });
      setNewDocTitle('');
      setNewDocContent('');
      loadDriveFiles();
    } catch (err: any) {
      setStatusMessage({ text: `Failed to create file: ${err.message}`, type: 'error' });
    } finally {
      setDriveLoading(false);
    }
  };

  // User Confirmation Dialog for Destructive Operations (MANDATORY per guidelines)
  const confirmDeleteDriveFile = async () => {
    if (!accessToken || !fileToDelete) return;
    const targetFile = fileToDelete;
    setFileToDelete(null);
    setDriveLoading(true);
    try {
      await deleteDriveFile(accessToken, targetFile.id);
      setStatusMessage({ text: `File "${targetFile.name}" was permanently removed from Google Drive.`, type: 'success' });
      loadDriveFiles();
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete file: ${err.message}`, type: 'error' });
    } finally {
      setDriveLoading(false);
    }
  };

  /* ---------------- Google Sheets Operations ---------------- */
  const handleCreateSheet = async (eventTitle: string) => {
    if (!accessToken) return;
    setSheetLoading(true);
    try {
      const sheet = await createEventSpreadsheet(accessToken, eventTitle || 'Annual General Meeting');
      setSheetsList((prev) => [sheet, ...prev]);
      setSelectedSheetId(sheet.spreadsheetId);
      setStatusMessage({ text: `Google Sheet "${sheet.title}" created with Attendees & Budget tabs!`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `Google Sheets Error: ${err.message}`, type: 'error' });
    } finally {
      setSheetLoading(false);
    }
  };

  const handleAppendAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedSheetId) return;
    if (!attendeeRow.name || !attendeeRow.email) return;

    setSheetLoading(true);
    try {
      await appendSpreadsheetRow(accessToken, selectedSheetId, [
        attendeeRow.name,
        attendeeRow.email,
        attendeeRow.ticketType,
        attendeeRow.status,
        new Date().toLocaleDateString(),
      ]);
      setStatusMessage({ text: `Added "${attendeeRow.name}" to the Google Sheet!`, type: 'success' });
      setAttendeeRow({ name: '', email: '', ticketType: 'General Admission', status: 'Confirmed' });
    } catch (err: any) {
      setStatusMessage({ text: `Failed to append attendee: ${err.message}`, type: 'error' });
    } finally {
      setSheetLoading(false);
    }
  };

  /* ---------------- Google Forms Operations ---------------- */
  const handleCreateForm = async (eventTitle: string) => {
    if (!accessToken) return;
    setFormLoading(true);
    try {
      const form = await createEventForm(accessToken, eventTitle || 'Tech & Leadership Conference');
      setFormsList((prev) => [form, ...prev]);
      setStatusMessage({ text: `Google Form "${form.title}" created with RSVP & Catering questions!`, type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: `Google Forms Error: ${err.message}`, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleFetchResponses = async (formId: string) => {
    if (!accessToken) return;
    setFormLoading(true);
    try {
      const responses = await getFormResponses(accessToken, formId);
      setSelectedFormResponses({ formId, responses });
      setStatusMessage({ text: `Retrieved ${responses.length} responses for Form ID: ${formId}`, type: 'info' });
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load responses: ${err.message}`, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  /* ---------------- Firestore Event Management ---------------- */
  const handlePublishEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.venue || !eventForm.date) return;

    const path = 'events';
    try {
      await addDoc(collection(db, path), {
        title: eventForm.title,
        category: eventForm.category,
        date: eventForm.date,
        venue: eventForm.venue,
        capacity: Number(eventForm.capacity),
        description: eventForm.description,
        organizerName: user?.displayName || 'Registered Organizer',
        organizerId: user?.uid || 'guest-user',
        createdAt: new Date().toISOString(),
      });
      setStatusMessage({ text: `Event "${eventForm.title}" published to Firestore!`, type: 'success' });
      setEventForm({
        title: '',
        category: 'Corporate Conference',
        date: '',
        venue: '',
        capacity: 100,
        description: '',
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the event "${title}" from Firestore?`);
    if (!confirmed) return;
    const path = `events/${id}`;
    try {
      await deleteDoc(doc(db, 'events', id));
      setStatusMessage({ text: `Event "${title}" removed from Firestore.`, type: 'info' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div>
      {/* 1. Header Banner */}
      <header className="header">
        <h1>Event Management System</h1>
        <p>Unified Cloud Platform: Google Drive, Sheets, Forms &amp; Firebase Firestore</p>
      </header>

      {/* 2. Top Navigation Bar */}
      <nav className="navbar">
        <ul>
          <li>
            <a 
              href="#overview" 
              className={activeTab === 'overview' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}
            >
              Overview &amp; Portals
            </a>
          </li>
          <li>
            <a 
              href="#drive" 
              className={activeTab === 'drive' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); setActiveTab('drive'); }}
            >
              Google Drive
            </a>
          </li>
          <li>
            <a 
              href="#sheets" 
              className={activeTab === 'sheets' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); setActiveTab('sheets'); }}
            >
              Google Sheets
            </a>
          </li>
          <li>
            <a 
              href="#forms" 
              className={activeTab === 'forms' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); setActiveTab('forms'); }}
            >
              Google Forms
            </a>
          </li>
          <li>
            <a 
              href="#firestore" 
              className={activeTab === 'firestore' ? 'active' : ''} 
              onClick={(e) => { e.preventDefault(); setActiveTab('firestore'); }}
            >
              Firestore Events ({events.length})
            </a>
          </li>

          {/* User Sign-In / Account status on right */}
          <li className="right">
            {user ? (
              <a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                Sign Out ({user.displayName || user.email?.split('@')[0]})
              </a>
            ) : (
              <a href="#login" onClick={(e) => { e.preventDefault(); handleGoogleLogin(); }}>
                Sign in with Google
              </a>
            )}
          </li>
        </ul>
      </nav>

      {/* 3. Sub-navigation Bar for Static W3Schools Registration Forms */}
      <div className="subnav">
        <span><strong>Static W3Schools Pages:</strong></span>
        <a href="home.html">Home</a>
        <a href="login.html">Login</a>
        <a href="Regcustomer.html">Customer Register</a>
        <a href="OrgRegistration.html">Organizer Register</a>
        <a href="ManagerReg.html">Manager Register</a>
        <a href="admin.html">Admin Register</a>
      </div>

      {/* 4. Main Content Container */}
      <main className="container">

        {/* Global Status Banner */}
        {statusMessage && (
          <div className={statusMessage.type === 'error' ? 'notice' : statusMessage.type === 'success' ? 'notice-success' : 'notice'}>
            <strong>Status:</strong> {statusMessage.text}
            <button 
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setStatusMessage(null)}
            >
              &times;
            </button>
          </div>
        )}

        {/* Firestore Connection Badge & Auth Prompt */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ 
              display: 'inline-block', 
              padding: '4px 10px', 
              borderRadius: '4px', 
              fontSize: '13px', 
              fontWeight: 'bold',
              backgroundColor: firestoreOnline ? '#ddffdd' : '#ffffcc',
              color: firestoreOnline ? '#04AA6D' : '#856404',
              border: `1px solid ${firestoreOnline ? '#04AA6D' : '#ffeeba'}`
            }}>
              ● Firebase Firestore: {firestoreOnline ? 'Online (Ready)' : 'Connecting...'}
            </span>
          </div>

          <div>
            {!user ? (
              <button 
                onClick={handleGoogleLogin} 
                disabled={authLoading}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#3c4043',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                Sign in with Google
              </button>
            ) : (
              <span style={{ fontSize: '14px', color: '#555555' }}>
                Connected as: <strong>{user.email}</strong>
              </span>
            )}
          </div>
        </div>

        {authError && (
          <div className="notice" style={{ backgroundColor: '#ffe6e6', borderColor: '#f44336', color: '#d32f2f' }}>
            <strong>Authentication Error:</strong> {authError}
          </div>
        )}

        {/* =========================================================================
            TAB 1: OVERVIEW & SYSTEM PORTALS
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div>
            <section className="card">
              <h2>Event Management System Cloud Console</h2>
              <p>
                Welcome to your fully integrated cloud backend! This system now features live 
                <strong> Google Drive</strong> for event documents, <strong>Google Sheets</strong> for budgets &amp; attendee lists, 
                <strong> Google Forms</strong> for RSVP surveys, and <strong>Firebase Firestore</strong> for real-time event persistence.
              </p>

              <div className="notice-success">
                <strong>Workspace Integration Active:</strong> Authenticate with your Google account to create and manage spreadsheets,
                survey forms, and drive assets directly synced to your scheduled events.
              </div>

              <div className="row">
                <div className="col-33">
                  <div className="service-box">
                    <h3>Google Drive</h3>
                    <p>Store event contracts, venue floor plans, and schedules in Google Drive.</p>
                    <button className="btn-green" onClick={() => setActiveTab('drive')}>Explore Drive</button>
                  </div>
                </div>

                <div className="col-33">
                  <div className="service-box">
                    <h3>Google Sheets</h3>
                    <p>Generate budget spreadsheets and append attendee rosters automatically.</p>
                    <button className="btn-green" onClick={() => setActiveTab('sheets')}>Open Sheets</button>
                  </div>
                </div>

                <div className="col-33">
                  <div className="service-box">
                    <h3>Google Forms</h3>
                    <p>Build RSVP forms with dietary choices and review attendee submissions live.</p>
                    <button className="btn-green" onClick={() => setActiveTab('forms')}>Create Forms</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Access to Static HTML Pages */}
            <section className="card">
              <h2>W3Schools Registration Pages</h2>
              <p>You can also navigate to the standalone, pure HTML/CSS registration forms:</p>
              <ul>
                <li><a href="home.html" className="link-green">Home Page (home.html)</a> - Complete public landing page</li>
                <li><a href="login.html" className="link-green">User Login (login.html)</a> - Multi-role login portal</li>
                <li><a href="Regcustomer.html" className="link-green">Customer Registration (Regcustomer.html)</a> - Attendee signup</li>
                <li><a href="OrgRegistration.html" className="link-green">Organizer Registration (OrgRegistration.html)</a> - Event host signup</li>
                <li><a href="ManagerReg.html" className="link-green">Manager Registration (ManagerReg.html)</a> - Operations manager signup</li>
                <li><a href="admin.html" className="link-green">Admin Registration (admin.html)</a> - Administrator clearance signup</li>
              </ul>
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 2: GOOGLE DRIVE INTEGRATION
           ========================================================================= */}
        {activeTab === 'drive' && (
          <div>
            <section className="card">
              <h2>Google Drive - Event Document Hub</h2>
              <p>Browse, upload, and organize event materials in your Google Drive.</p>

              {!accessToken ? (
                <div className="notice">
                  <p><strong>Sign in Required:</strong> Please connect your Google account to access your Google Drive files.</p>
                  <button className="btn-green" onClick={handleGoogleLogin}>Sign in with Google</button>
                </div>
              ) : (
                <div>
                  {/* Create New File Form */}
                  <h3>Create New Event Document in Google Drive</h3>
                  <form onSubmit={handleCreateDriveFile}>
                    <div className="row">
                      <div className="col-50">
                        <label htmlFor="drive-file-title">Document Title: <span className="required-star">*</span></label>
                        <input 
                          type="text" 
                          id="drive-file-title" 
                          placeholder="e.g. Venue Rental Contract &amp; Terms"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-50-last">
                        <label htmlFor="drive-filter">Filter Drive Files:</label>
                        <input 
                          type="text" 
                          id="drive-filter" 
                          placeholder="Search keyword..."
                          value={driveFilter}
                          onChange={(e) => setDriveFilter(e.target.value)}
                        />
                      </div>
                    </div>

                    <label htmlFor="drive-file-content">Document Notes / Content:</label>
                    <textarea 
                      id="drive-file-content" 
                      placeholder="Enter briefing notes, itinerary, or venue clauses..."
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                    ></textarea>

                    <div className="button-row">
                      <input 
                        type="submit" 
                        value={driveLoading ? 'Creating in Drive...' : 'Save to Google Drive'} 
                        className="btn-submit" 
                        disabled={driveLoading}
                      />
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={loadDriveFiles} 
                        disabled={driveLoading}
                        style={{ marginLeft: '10px' }}
                      >
                        {driveLoading ? 'Loading Files...' : 'Refresh Drive Files'}
                      </button>
                    </div>
                  </form>

                  {/* Drive Files Table */}
                  <h3 style={{ marginTop: '30px' }}>Your Google Drive Files</h3>
                  {driveFiles.length === 0 ? (
                    <p className="text-muted">No files loaded yet. Click &quot;Refresh Drive Files&quot; above to list your files.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>MIME Type</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driveFiles.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <strong>{file.name}</strong>
                            </td>
                            <td><span className="text-muted">{file.mimeType}</span></td>
                            <td>
                              {file.webViewLink && (
                                <a 
                                  href={file.webViewLink} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="link-green"
                                  style={{ marginRight: '15px' }}
                                >
                                  Open in Drive ↗
                                </a>
                              )}
                              <button 
                                className="btn-red" 
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => setFileToDelete(file)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 3: GOOGLE SHEETS INTEGRATION
           ========================================================================= */}
        {activeTab === 'sheets' && (
          <div>
            <section className="card">
              <h2>Google Sheets - Event Logistics &amp; Budget Tracker</h2>
              <p>Create real spreadsheets with pre-configured Attendee and Budget sheets, and append live RSVP records.</p>

              {!accessToken ? (
                <div className="notice">
                  <p><strong>Sign in Required:</strong> Connect your Google account to create and manage Google Spreadsheets.</p>
                  <button className="btn-green" onClick={handleGoogleLogin}>Sign in with Google</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <button 
                      className="btn-green" 
                      onClick={() => handleCreateSheet('Tech Conference 2026')} 
                      disabled={sheetLoading}
                    >
                      {sheetLoading ? 'Creating Sheet...' : '+ Generate New Event Spreadsheet'}
                    </button>
                  </div>

                  {sheetsList.length > 0 && (
                    <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
                      <label htmlFor="select-sheet">Active Spreadsheet:</label>
                      <select 
                        id="select-sheet" 
                        value={selectedSheetId} 
                        onChange={(e) => setSelectedSheetId(e.target.value)}
                      >
                        {sheetsList.map((s) => (
                          <option key={s.spreadsheetId} value={s.spreadsheetId}>
                            {s.title} ({s.spreadsheetId.substring(0, 8)}...)
                          </option>
                        ))}
                      </select>

                      {selectedSheetId && (
                        <div style={{ marginTop: '10px' }}>
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${selectedSheetId}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="link-green"
                          >
                            Open Active Spreadsheet in Google Sheets ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Append Attendee Form */}
                  <h3>Append Attendee to Google Sheet</h3>
                  <form onSubmit={handleAppendAttendee}>
                    <div className="row">
                      <div className="col-50">
                        <label htmlFor="sheet-attendee-name">Attendee Name: <span className="required-star">*</span></label>
                        <input 
                          type="text" 
                          id="sheet-attendee-name" 
                          placeholder="e.g. Sarah Jenkins"
                          value={attendeeRow.name}
                          onChange={(e) => setAttendeeRow({ ...attendeeRow, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-50-last">
                        <label htmlFor="sheet-attendee-email">Attendee Email: <span className="required-star">*</span></label>
                        <input 
                          type="email" 
                          id="sheet-attendee-email" 
                          placeholder="e.g. sarah.j@example.com"
                          value={attendeeRow.email}
                          onChange={(e) => setAttendeeRow({ ...attendeeRow, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-50">
                        <label htmlFor="sheet-ticket-type">Ticket Type:</label>
                        <select 
                          id="sheet-ticket-type"
                          value={attendeeRow.ticketType}
                          onChange={(e) => setAttendeeRow({ ...attendeeRow, ticketType: e.target.value })}
                        >
                          <option value="General Admission">General Admission</option>
                          <option value="VIP Pass">VIP Pass</option>
                          <option value="Speaker / Sponsor">Speaker / Sponsor</option>
                          <option value="Student Pass">Student Pass</option>
                        </select>
                      </div>
                      <div className="col-50-last">
                        <label htmlFor="sheet-status">RSVP Status:</label>
                        <select 
                          id="sheet-status"
                          value={attendeeRow.status}
                          onChange={(e) => setAttendeeRow({ ...attendeeRow, status: e.target.value })}
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Pending Payment">Pending Payment</option>
                          <option value="Waitlist">Waitlist</option>
                        </select>
                      </div>
                    </div>

                    <div className="button-row">
                      <input 
                        type="submit" 
                        value={sheetLoading ? 'Appending...' : 'Append Attendee to Sheet'} 
                        className="btn-submit" 
                        disabled={sheetLoading || !selectedSheetId}
                      />
                      {!selectedSheetId && (
                        <span className="text-muted" style={{ marginLeft: '10px' }}>Create a sheet first above to enable appending.</span>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 4: GOOGLE FORMS INTEGRATION
           ========================================================================= */}
        {activeTab === 'forms' && (
          <div>
            <section className="card">
              <h2>Google Forms - Event RSVP &amp; Feedback Surveys</h2>
              <p>Create real Google Forms for RSVP collection, catering requirements, and attendee feedback.</p>

              {!accessToken ? (
                <div className="notice">
                  <p><strong>Sign in Required:</strong> Please connect your Google account to create and inspect Google Forms.</p>
                  <button className="btn-green" onClick={handleGoogleLogin}>Sign in with Google</button>
                </div>
              ) : (
                <div>
                  <button 
                    className="btn-green" 
                    onClick={() => handleCreateForm('Annual Gala & Networking Night')} 
                    disabled={formLoading}
                  >
                    {formLoading ? 'Creating Form...' : '+ Create New Google RSVP Form'}
                  </button>

                  <h3 style={{ marginTop: '30px' }}>Created Google Forms</h3>
                  {formsList.length === 0 ? (
                    <p className="text-muted">No Google Forms created in this session yet. Click the button above to generate one.</p>
                  ) : (
                    <div>
                      {formsList.map((form) => (
                        <div key={form.formId} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '15px', backgroundColor: '#ffffff' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#04AA6D' }}>{form.title}</h4>
                          <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Form ID:</strong> {form.formId}</p>
                          <div style={{ marginTop: '10px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <a href={form.responderUri} target="_blank" rel="noreferrer" className="link-green">
                              Open Attendee RSVP Form ↗
                            </a>
                            {form.editUri && (
                              <a href={form.editUri} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '13px' }}>
                                Edit in Google Forms ↗
                              </a>
                            )}
                            <button 
                              className="btn-green" 
                              style={{ padding: '4px 12px', fontSize: '13px' }}
                              onClick={() => handleFetchResponses(form.formId)}
                            >
                              Check Live Responses
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form Responses Viewer */}
                  {selectedFormResponses && (
                    <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
                      <h4>Form Responses for {selectedFormResponses.formId}</h4>
                      {selectedFormResponses.responses.length === 0 ? (
                        <p className="text-muted">No responses submitted yet. Open the attendee link above to test submitting a response!</p>
                      ) : (
                        <pre style={{ backgroundColor: '#ffffff', padding: '10px', border: '1px solid #eee', overflowX: 'auto' }}>
                          {JSON.stringify(selectedFormResponses.responses, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================================
            TAB 5: FIRESTORE DATABASE
           ========================================================================= */}
        {activeTab === 'firestore' && (
          <div>
            <section className="card">
              <h2>Firebase Firestore - Event Management Database</h2>
              <p>Store, query, and manage scheduled events in persistent Cloud Firestore.</p>

              {/* Publish Event Form */}
              <h3>Publish New Event to Firestore</h3>
              <form onSubmit={handlePublishEvent}>
                <div className="row">
                  <div className="col-50">
                    <label htmlFor="evt-title">Event Title: <span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      id="evt-title" 
                      placeholder="e.g. International AI Summit 2026"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-50-last">
                    <label htmlFor="evt-cat">Event Category: <span className="required-star">*</span></label>
                    <select 
                      id="evt-cat"
                      value={eventForm.category}
                      onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    >
                      <option value="Corporate Conference">Corporate Conference</option>
                      <option value="Music Festival">Music Festival</option>
                      <option value="Wedding & Celebration">Wedding &amp; Celebration</option>
                      <option value="Exhibition & Trade Show">Exhibition &amp; Trade Show</option>
                      <option value="Sports & Fitness">Sports &amp; Fitness</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-50">
                    <label htmlFor="evt-date">Date &amp; Time: <span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      id="evt-date" 
                      placeholder="e.g. Nov 18, 2026 - 10:00 AM"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-50-last">
                    <label htmlFor="evt-venue">Venue Location: <span className="required-star">*</span></label>
                    <input 
                      type="text" 
                      id="evt-venue" 
                      placeholder="e.g. City Grand Expo Center, Hall A"
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-50">
                    <label htmlFor="evt-cap">Guest Capacity:</label>
                    <input 
                      type="number" 
                      id="evt-cap" 
                      min="1"
                      value={eventForm.capacity}
                      onChange={(e) => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="col-50-last">
                    <label htmlFor="evt-desc">Short Description:</label>
                    <input 
                      type="text" 
                      id="evt-desc" 
                      placeholder="Brief overview of keynotes, topics, or agenda..."
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="button-row">
                  <input type="submit" value="Publish to Firestore" className="btn-submit" />
                  <input 
                    type="reset" 
                    value="Clear" 
                    className="btn-reset" 
                    onClick={() => setEventForm({ title: '', category: 'Corporate Conference', date: '', venue: '', capacity: 100, description: '' })}
                  />
                </div>
              </form>

              {/* Firestore Events List */}
              <h3 style={{ marginTop: '30px' }}>Active Events in Cloud Firestore</h3>
              {events.length === 0 ? (
                <p className="text-muted">No events currently stored in Firestore. Use the form above to publish your first event!</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Event Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Venue</th>
                      <th>Capacity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt) => (
                      <tr key={evt.id}>
                        <td>
                          <strong>{evt.title}</strong>
                          {evt.description && <div className="text-muted">{evt.description}</div>}
                        </td>
                        <td>{evt.category}</td>
                        <td>{evt.date}</td>
                        <td>{evt.venue}</td>
                        <td>{evt.capacity} attendees</td>
                        <td>
                          <button 
                            className="btn-red" 
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}

      </main>

      {/* 5. Destructive Action Confirmation Modal (MANDATORY for Google Workspace) */}
      {fileToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '25px',
            borderRadius: '4px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#f44336' }}>Confirm File Deletion</h3>
            <p>
              Are you sure you want to delete <strong>&quot;{fileToDelete.name}&quot;</strong> from your Google Drive?
            </p>
            <p className="text-muted" style={{ fontSize: '13px' }}>
              This will permanently remove the item from your Google Drive. This action cannot be undone.
            </p>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setFileToDelete(null)}
                style={{ marginRight: '10px' }}
              >
                Cancel
              </button>
              <button 
                className="btn-red" 
                onClick={confirmDeleteDriveFile}
              >
                Yes, Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Standard W3Schools Dark Footer */}
      <footer className="footer">
        <p>&copy; 2026 Event Management System. All rights reserved.</p>
        <p>
          <a href="home.html">Home</a> | 
          <a href="login.html">Login</a> | 
          <a href="Regcustomer.html">Customer Registration</a> | 
          <a href="OrgRegistration.html">Organizer Registration</a> | 
          <a href="ManagerReg.html">Manager Registration</a> | 
          <a href="admin.html">Admin Registration</a>
        </p>
        <p className="text-muted">
          Integrated with Google Workspace APIs (Drive, Sheets, Forms) and Google Firebase Firestore
        </p>
      </footer>
    </div>
  );
}
