import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import LogInteractionForm from './components/form/LogInteractionForm';
import ChatInterface from './components/chat/ChatInterface';
import InteractionsList from './components/shared/InteractionsList';
import './styles/global.css';
import { LayoutGrid, MessageSquare, ListOrdered, Activity } from 'lucide-react';

const TABS = [
  { id: 'form', label: 'Log Form', Icon: LayoutGrid },
  { id: 'chat', label: 'AI Chat', Icon: MessageSquare },
  { id: 'history', label: 'History', Icon: ListOrdered },
];

function App() {
  const [activeTab, setActiveTab] = useState('form');

  return (
    <div className="app-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Activity size={20} className="brand-icon" />
          <span>HCP<strong>CRM</strong></span>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">FR</div>
            <div className="user-info">
              <span className="user-name">Field Rep</span>
              <span className="user-role">Sales Representative</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">Log HCP Interaction</h1>
            <span className="page-subtitle">
              {activeTab === 'form' && 'Structured Form'}
              {activeTab === 'chat' && 'AI-Powered Chat Interface'}
              {activeTab === 'history' && 'Interaction History'}
            </span>
          </div>
          <div className="topbar-tabs">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {activeTab === 'form' && (
            <div className="split-view">
              <div className="split-left">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Interaction Details</h2>
                  </div>
                  <LogInteractionForm onSuccess={() => {}} />
                </div>
              </div>
              <div className="split-right">
                <ChatInterface />
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="full-chat-view">
              <ChatInterface />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-view">
              <InteractionsList />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Root() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
