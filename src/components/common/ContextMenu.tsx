import React, { useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  visible: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose, visible }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Adjust position to keep menu within viewport
    const adjustPosition = () => {
      if (!menuRef.current) return;

      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position
      if (position.x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }

      // Adjust vertical position
      if (position.y + menuRect.height > viewportHeight) {
        newY = viewportHeight - menuRect.height - 10;
      }

      setAdjustedPosition({ x: Math.max(10, newX), y: Math.max(10, newY) });
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    // Adjust position after initial render
    setTimeout(adjustPosition, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, position, onClose]);

  if (!visible) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    
    item.action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
        border: '1px solid #4a4a6a',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        minWidth: '180px',
        maxWidth: '250px',
        padding: '8px 0',
        animation: 'contextMenuFadeIn 0.15s ease-out'
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              style={{
                height: '1px',
                background: '#4a4a6a',
                margin: '4px 0'
              }}
            />
          );
        }

        return (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            style={{
              padding: '8px 16px',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: item.disabled 
                ? '#666' 
                : item.destructive 
                  ? '#ff6b7a' 
                  : '#ffffff',
              fontSize: '14px',
              transition: 'background-color 0.1s ease',
              opacity: item.disabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = item.destructive 
                  ? 'rgba(220, 53, 69, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {item.icon && (
              <span style={{ fontSize: '16px', width: '16px', textAlign: 'center' }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.submenu && (
              <span style={{ fontSize: '12px', color: '#a0a0a0' }}>▶</span>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes contextMenuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ContextMenu;