import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const ModalManager: React.FC = () => {
  const { modals } = useSelector((state: RootState) => state.ui);
  
  if (modals.length === 0) return null;
  
  return (
    <div className="modal-manager">
      {modals.map(modal => (
        <div key={modal.id} className="modal-overlay">
          <div className="modal-content">
            <h3>{modal.title}</h3>
            <div>{modal.content}</div>
            <div className="modal-actions">
              <button onClick={() => modal.onConfirm?.()}>OK</button>
              <button onClick={() => modal.onCancel?.()}>Cancel</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModalManager;