import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import {
  MessageSquare,
  Send,
  GripHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Paperclip,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const FileCommentPanel = ({ selectedDevice }) => {
  const { currentUser } = useApp();
  const [comments, setComments] = useState([
    {
      id: 'c1',
      author: 'Eleni Vance (Senior Field Tech)',
      role: 'Grid Maintenance',
      timestamp: 'Today at 09:14 AM',
      text: 'Routine annual battery impedance check completed on Pier 14 string. PV panel clean; no shading detected from new promenade lampposts.',
      type: 'info',
      deviceId: 'SL-SF-001',
    },
    {
      id: 'c2',
      author: 'Marcus Chen (Solar Lead)',
      role: 'Operations Engineer',
      timestamp: 'Yesterday at 04:30 PM',
      text: 'Permit #SF-2026-PV42 approved for civic corridor array upgrade. Ensure 48V DALI-2 bus cable strain relief is re-tightened during next maintenance cycle.',
      type: 'alert',
      deviceId: 'SL-SF-002',
    },
    {
      id: 'c3',
      author: 'Sarah Jenkins (Dispatcher)',
      role: 'Fleet Command',
      timestamp: 'Oct 16, 2026, 11:05 AM',
      text: 'All municipal lighting zones synced to autumnal sunset curve (18:18 local). Emergency override tests completed successfully without load spikes.',
      type: 'success',
      deviceId: 'ALL',
    },
  ]);

  const [newText, setNewText] = useState('');
  const [panelHeight, setPanelHeight] = useState(210); // default height
  const [isCollapsedMobile, setIsCollapsedMobile] = useState(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(210);
  const listRef = useRef(null);

  const minHeight = 130;
  const maxHeight = 420;

  // Handle desktop drag resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      // Dragging upward increases height, dragging downward decreases height
      const deltaY = startYRef.current - e.clientY;
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
      setPanelHeight(nextHeight);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const authorName = currentUser?.displayName || 'System Operator';
    const authorRole = currentUser?.role || 'Operations Desk';

    const newComment = {
      id: `c_${Date.now()}`,
      author: authorName,
      role: authorRole,
      timestamp: 'Just now',
      text: newText.trim(),
      type: 'info',
      deviceId: selectedDevice?.id || 'General Siting',
    };

    setComments((prev) => [newComment, ...prev]);
    setNewText('');

    if (selectedDevice?.id) {
      ApiService.updateDevice(selectedDevice.id, {
        newComment,
        notes: newText.trim(),
      }).catch((err) => console.warn('Could not persist comment to backend:', err.message));
    }
  };

  return (
    <div
      className={`file-comment-panel ${isCollapsedMobile ? 'collapsed' : ''}`}
      style={{ height: isCollapsedMobile ? 'auto' : `${panelHeight}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Resizing Handle on Desktop */}
      <div
        className="comment-panel-resize-handle"
        onMouseDown={handleDragStart}
        title="Drag up or down to resize comment panel (Min: 130px, Max: 420px)"
        aria-label="Resize comment panel"
      >
        <GripHorizontal size={16} />
      </div>

      {/* Header with Title and Mobile Expand/Collapse Toggle */}
      <div className="comment-panel-header">
        <div className="comment-header-title">
          <MessageSquare size={16} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
            Site Notes &amp; Infrastructure Comments
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
            {comments.length}
          </span>
          {selectedDevice && (
            <span className="badge badge-info" style={{ fontSize: '10.5px' }}>
              Target: {selectedDevice.id}
            </span>
          )}
        </div>

        <button
          className="comment-collapse-btn mobile-only"
          onClick={() => setIsCollapsedMobile(!isCollapsedMobile)}
          aria-label={isCollapsedMobile ? 'Expand comments' : 'Collapse comments'}
        >
          {isCollapsedMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!isCollapsedMobile && (
        <div className="comment-panel-body">
          {/* Scrollable list of comments */}
          <div className="comment-list-scrollable" ref={listRef}>
            {comments.map((c) => (
              <div key={c.id} className="comment-bubble-item">
                <div className="comment-item-top">
                  <div className="comment-item-author">
                    <User size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span className="author-name">{c.author}</span>
                    <span className="author-role">({c.role})</span>
                  </div>
                  <div className="comment-item-meta">
                    <Clock size={11} />
                    <span>{c.timestamp}</span>
                    <span className="comment-target-badge">{c.deviceId}</span>
                  </div>
                </div>
                <div className="comment-item-text">{c.text}</div>
              </div>
            ))}
          </div>

          {/* New Comment Input Box */}
          <form className="comment-input-form" onSubmit={handleAddComment}>
            <input
              type="text"
              placeholder={`Add field observation for ${selectedDevice?.id || 'this site'}...`}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="comment-text-input"
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm comment-submit-btn"
              disabled={!newText.trim()}
              title="Post comment"
            >
              <Send size={13} />
              <span>Post</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
