import React, { createContext, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- MOCK DATA ---
const MOCK_EVENTS = [
    { id: '1', title: 'Phase 4 Review Meeting', start: new Date(Date.now() + 86400000).toISOString(), end: new Date(Date.now() + 86400000 + 3600000).toISOString(), description: 'Review UI/UX changes', color: '#4A90E2', isAttending: true, isHosting: false },
    { id: '2', title: 'Project Submission Deadline', start: new Date(Date.now() + 4 * 86400000).toISOString(), end: new Date(Date.now() + 4 * 86400000).toISOString(), allDay: true, color: '#F5A623', isAttending: false, isHosting: false },
    { id: '3', title: 'Group Lunch (Hosting)', start: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + 'T13:00:00', end: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + 'T14:30:00', color: '#7ED321', isAttending: true, isHosting: true },
    { id: '4', title: 'Past Event', start: new Date(Date.now() - 86400000).toISOString(), end: new Date(Date.now() - 86400000 + 3600000).toISOString(), description: 'Old meeting', color: '#999999', isAttending: false, isHosting: false },
];

// --- MOCK AUTHENTICATION CONTEXT ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(true); 

    const login = () => setIsAuthenticated(true);
    const logout = () => setIsAuthenticated(false);

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
const useAuth = () => useContext(AuthContext);


const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const handleLogin = (e) => {
        e.preventDefault();
        login(); 
        navigate('/dashboard'); 
    };

    return (
        <div className="loginContainer">
            <h2 className="header">Event Scheduler Planner</h2>
            <p className="subHeader">User</p>
            <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" className="input" required />
                <input type="password" placeholder="Password" className="input" required />
                <button type="submit" className="button">View Dashboard UI</button>
            </form>
        </div>
    );
};




const CalendarDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState(MOCK_EVENTS);
    const [showModal, setShowModal] = useState(false); 
    const [filterType, setFilterType] = useState('All'); 


    const getFilteredEvents = (currentEvents, type) => {
        const now = new Date();
        switch (type) {
            case 'UpcomingEvents':
                
                return currentEvents.filter(event => new Date(event.start) > now);
            case 'Attending':
                
                return currentEvents.filter(event => event.isAttending);
            case 'Hosting':
                
                return currentEvents.filter(event => event.isHosting);
            case 'All':
            default:
                return currentEvents;
        }
    };

    const handleFilterClick = (type) => {
        setFilterType(type);
    };

    const displayedEvents = getFilteredEvents(events, filterType);
    
    // --- Event Handlers ---
    const handleEventDrop = (info) => {
        const eventId = info.event.id;
        const newStart = info.event.startStr;
        
        console.log(`[MOCK] Event ${eventId} moved to ${newStart}. (API call skipped)`);
        
        setEvents(prevEvents => prevEvents.map(e => e.id === eventId ? { 
            ...e, 
            start: newStart, 
            end: info.event.endStr || e.end 
        } : e));

        const messageBox = document.getElementById('message-box');
        messageBox.textContent = `Event "${info.event.title}" moved successfully! (Mocked update)`;
        messageBox.style.opacity = 1;
        setTimeout(() => messageBox.style.opacity = 0, 3000);
    };
    
    const handleMockSave = (newEvent) => {
        setEvents(prevEvents => [...prevEvents, newEvent]);
        
        const messageBox = document.getElementById('message-box');
        messageBox.textContent = `New Event "${newEvent.title}" created successfully!`;
        messageBox.style.opacity = 1;
        setTimeout(() => messageBox.style.opacity = 0, 3000);
    };

    const handleEventClick = (info) => {
        console.log(`[UI/UX] Redirecting to event details for ID: ${info.event.id}`);
        navigate(`/event/${info.event.id}`);
    };
    
    return (
        <div className="dashboardContainer">
            {/* Custom Message Box for Notifications */}
            <div id="message-box" className="messageBox"></div>
            
            <header className="dashboardHeader">
                <h1 style={{margin: 0}}>Event Scheduler Dashboard</h1>
                <div className="headerControls">
                    <button className="createButton" onClick={() => setShowModal(true)}>+ Create New Event</button> 
                    <button onClick={logout} className="logoutButton">Logout</button>
                </div>
            </header>

            <main className="mainContent">
                <div className="sidebar">
                    <h3>🔍 Quick Filters</h3>
                    <ul className="filterList">
                        <li 
                            className={`filterItem ${filterType === 'All' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('All')}
                        >
                            All Events
                        </li>
                        <li 
                            className={`filterItem ${filterType === 'UpcomingEvents' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('UpcomingEvents')}
                        >
                            Upcoming Events
                        </li>
                        <li 
                            className={`filterItem ${filterType === 'Attending' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('Attending')}
                        >
                            Events I'm Attending
                        </li>
                        <li 
                            className={`filterItem ${filterType === 'Hosting' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('Hosting')}
                        >
                            Events I'm Hosting
                        </li>
                        <li 
                            className={`filterItem ${filterType === 'DateRange' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('DateRange')}
                        >
                            Search by Date Range... (Mock)
                        </li>
                    </ul>
                </div>
                
                <div className="calendarArea">
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridDay,dayGridWeek,dayGridMonth'
                        }}
                        events={displayedEvents} 
                        editable={true} 
                        eventDrop={handleEventDrop} 
                        eventClick={handleEventClick} 
                        height="auto" 
                    />
                </div>
            </main>

            <NewEventForm 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onSave={handleMockSave} 
            />
        </div>
    );
};


const PrivateRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/" replace />;
};


const EventDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const eventId = location.pathname.split('/').pop();
    
    return (
        <div className="detailPage">
            <h2>Event Details </h2>
            <p className="detailText">Hosting Phase 5 at 4.00am <strong>{eventId}</strong>.</p>
            <button onClick={() => navigate('/dashboard')} className="backButton">
                ← Back to Calendar
            </button>
        </div>
    );
};


const NewEventForm = ({ show, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [start, setStart] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !start) {
            console.error('Title and Date are required!'); 
            return;
        }
        
        const newEvent = {
            id: Date.now().toString(),
            title,
            start: start,
            end: start, 
            description,
            color: '#34A853', 
            isAttending: true, 
            isHosting: true,
        };

        onSave(newEvent);
        onClose();
        // Reset form
        setTitle('');
        setStart('');
        setDescription('');
    };

    if (!show) return null;

    return (
        <div className="modalOverlay">
            <div className="modalContent">
                <h3 className="modalHeader">Create New Event</h3>
                <form onSubmit={handleSubmit}>
                    <label className="label">Title*</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
                    
                    <label className="label">Date & Time*</label>
                    <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="input" required />
                    
                    <label className="label">Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" />
                    
                    <div className="modalActions">
                        <button type="button" onClick={onClose} className="cancelButton">Cancel</button>
                        <button type="submit" className="button smallButton">Save Event</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route 
                        path="/dashboard" 
                        element={
                            <PrivateRoute>
                                <CalendarDashboard />
                            </PrivateRoute>
                        } 
                    />
                    <Route 
                        path="/event/:id" 
                        element={
                            <PrivateRoute>
                                <EventDetails />
                            </PrivateRoute>
                        } 
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
export default App;
