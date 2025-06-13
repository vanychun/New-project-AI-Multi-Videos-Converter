import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './FeatureTour.css';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  selector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'hover' | 'focus' | 'highlight';
    delay?: number;
  };
  screenshot?: boolean;
  autoAdvance?: number;
  skippable?: boolean;
}

export interface TourDefinition {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  autoStart?: boolean;
  showProgress?: boolean;
  allowKeyboardNavigation?: boolean;
}

interface FeatureTourProps {
  tour: TourDefinition;
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
  mcpService?: any; // MCPIntegrationService instance
}

export const FeatureTour: React.FC<FeatureTourProps> = ({
  tour,
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  mcpService
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = tour.steps[currentStepIndex];
  const isLastStep = currentStepIndex === tour.steps.length - 1;

  useEffect(() => {
    if (isActive && tour.steps.length > 0) {
      setIsVisible(true);
      setCurrentStepIndex(0);
    } else {
      setIsVisible(false);
    }
  }, [isActive, tour.steps.length]);

  useEffect(() => {
    if (isVisible && currentStep) {
      executeStep(currentStep);
      onStepChange?.(currentStepIndex);
    }
  }, [currentStepIndex, isVisible, currentStep, onStepChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible || !tour.allowKeyboardNavigation) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'Space':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'Escape':
          event.preventDefault();
          handleSkip();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, tour.allowKeyboardNavigation]);

  const executeStep = async (step: TourStep) => {
    try {
      // Find the target element
      const element = document.querySelector(step.selector);
      if (!element) {
        console.warn(`Tour step element not found: ${step.selector}`);
        return;
      }

      // Highlight the element
      setHighlightedElement(element);
      
      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let position = calculateTooltipPosition(rect, step.position, scrollTop, scrollLeft);
      setTooltipPosition(position);

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Execute the step action
      if (step.action) {
        await executeStepAction(step.action, element);
      }

      // Take screenshot if requested
      if (step.screenshot && mcpService) {
        await mcpService.captureCurrentState(`tour_${tour.id}_step_${currentStepIndex + 1}`);
      }

      // Auto-advance if configured
      if (step.autoAdvance) {
        setTimeout(() => {
          handleNext();
        }, step.autoAdvance);
      }
    } catch (error) {
      console.error('Error executing tour step:', error);
    }
  };

  const executeStepAction = async (action: TourStep['action'], element: Element) => {
    if (!action) return;

    const delay = action.delay || 0;
    
    await new Promise(resolve => setTimeout(resolve, delay));

    switch (action.type) {
      case 'click':
        // Simulate click for demo purposes
        element.classList.add('tour-click-animation');
        setTimeout(() => element.classList.remove('tour-click-animation'), 300);
        break;
      case 'hover':
        element.classList.add('tour-hover-animation');
        setTimeout(() => element.classList.remove('tour-hover-animation'), 1000);
        break;
      case 'focus':
        if (element instanceof HTMLElement) {
          element.focus();
        }
        break;
      case 'highlight':
        element.classList.add('tour-highlight-pulse');
        setTimeout(() => element.classList.remove('tour-highlight-pulse'), 2000);
        break;
    }
  };

  const calculateTooltipPosition = (
    rect: DOMRect, 
    position: TourStep['position'], 
    scrollTop: number, 
    scrollLeft: number
  ) => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 20;

    switch (position) {
      case 'top':
        return {
          top: rect.top + scrollTop - tooltipHeight - offset,
          left: rect.left + scrollLeft + rect.width / 2 - tooltipWidth / 2
        };
      case 'bottom':
        return {
          top: rect.bottom + scrollTop + offset,
          left: rect.left + scrollLeft + rect.width / 2 - tooltipWidth / 2
        };
      case 'left':
        return {
          top: rect.top + scrollTop + rect.height / 2 - tooltipHeight / 2,
          left: rect.left + scrollLeft - tooltipWidth - offset
        };
      case 'right':
        return {
          top: rect.top + scrollTop + rect.height / 2 - tooltipHeight / 2,
          left: rect.right + scrollLeft + offset
        };
      case 'center':
      default:
        return {
          top: window.innerHeight / 2 - tooltipHeight / 2 + scrollTop,
          left: window.innerWidth / 2 - tooltipWidth / 2 + scrollLeft
        };
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    setHighlightedElement(null);
    onSkip();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setHighlightedElement(null);
    onComplete();
  };

  if (!isVisible || !currentStep) {
    return null;
  }

  const overlay = (
    <div className="feature-tour-overlay" ref={overlayRef}>
      {/* Backdrop */}
      <div className="tour-backdrop" />
      
      {/* Highlight */}
      {highlightedElement && (
        <div 
          className="tour-highlight"
          style={{
            top: highlightedElement.getBoundingClientRect().top + window.pageYOffset,
            left: highlightedElement.getBoundingClientRect().left + window.pageXOffset,
            width: highlightedElement.getBoundingClientRect().width,
            height: highlightedElement.getBoundingClientRect().height,
          }}
        />
      )}
      
      {/* Tooltip */}
      <div 
        className="tour-tooltip"
        ref={tooltipRef}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <div className="tour-tooltip-header">
          <h3 className="tour-step-title">{currentStep.title}</h3>
          {tour.showProgress && (
            <div className="tour-progress">
              {currentStepIndex + 1} of {tour.steps.length}
            </div>
          )}
        </div>
        
        <div className="tour-tooltip-content">
          <p>{currentStep.content}</p>
        </div>
        
        <div className="tour-tooltip-footer">
          <div className="tour-controls">
            {currentStepIndex > 0 && (
              <button 
                className="tour-btn tour-btn-secondary"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}
            
            <div className="tour-controls-right">
              {currentStep.skippable !== false && (
                <button 
                  className="tour-btn tour-btn-ghost"
                  onClick={handleSkip}
                >
                  Skip Tour
                </button>
              )}
              
              <button 
                className="tour-btn tour-btn-primary"
                onClick={handleNext}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
          
          {tour.showProgress && (
            <div className="tour-progress-bar">
              <div 
                className="tour-progress-fill"
                style={{ width: `${((currentStepIndex + 1) / tour.steps.length) * 100}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Arrow pointer */}
        <div className={`tour-arrow tour-arrow-${currentStep.position}`} />
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default FeatureTour;