/**
 * 视觉仪式编排器测试
 */

import { VisualRitualOrchestrator, VisualScene, RitualStyle } from '../VisualRitualOrchestrator';
import { RitualType, RitualIntensity } from '../../types';

// Mock DOM environment
type TestElement = HTMLElement & {
  classList: {
    add: jest.Mock;
    remove: jest.Mock;
    contains: jest.Mock;
  };
  style: {
    setProperty: jest.Mock;
    getProperty: jest.Mock;
  };
};

const mockElement = {
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  style: {
    setProperty: jest.fn(),
    getProperty: jest.fn()
  }
} as unknown as TestElement;

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => mockElement),
    head: {
      appendChild: jest.fn()
    },
    body: {
      animate: jest.fn(() => ({
        addEventListener: jest.fn()
      }))
    },
    dispatchEvent: jest.fn()
  }
});

describe('VisualRitualOrchestrator', () => {
  let orchestrator: VisualRitualOrchestrator;

  beforeEach(() => {
    orchestrator = new VisualRitualOrchestrator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.destroy();
  });

  describe('createRitualScene', () => {
    it('should create a welcome ritual scene', () => {
      const scene = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.MODERATE);
      
      expect(scene).toBeDefined();
      expect(scene.type).toBe(RitualType.WELCOME);
      expect(scene.intensity).toBe(RitualIntensity.MODERATE);
      expect(scene.elements).toHaveLength(2); // background glow + border
      expect(scene.duration).toBeGreaterThan(0);
    });

    it('should create achievement ritual scene with appropriate elements', () => {
      const scene = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.DRAMATIC);
      
      expect(scene.type).toBe(RitualType.ACHIEVEMENT);
      expect(scene.intensity).toBe(RitualIntensity.DRAMATIC);
      expect(scene.elements).toHaveLength(2); // glow + icon
      
      const glowElement = scene.elements.find(el => el.id === 'achievement-glow');
      const iconElement = scene.elements.find(el => el.id === 'achievement-icon');
      
      expect(glowElement).toBeDefined();
      expect(iconElement).toBeDefined();
    });

    it('should create milestone scene with epic intensity', () => {
      const scene = orchestrator.createRitualScene(RitualType.MILESTONE, RitualIntensity.EPIC);
      
      expect(scene.type).toBe(RitualType.MILESTONE);
      expect(scene.intensity).toBe(RitualIntensity.EPIC);
      expect(scene.elements).toHaveLength(2); // frame + celebration particles
      expect(scene.duration).toBeGreaterThan(4000); // Epic intensity should have longer duration
    });

    it('should adjust scene duration based on intensity', () => {
      const subtleScene = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.SUBTLE);
      const epicScene = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.EPIC);
      
      expect(epicScene.duration).toBeGreaterThan(subtleScene.duration);
    });
  });

  describe('applyRitualStyling', () => {
    it('should apply basic ritual styling', () => {
      const style: RitualStyle = {
        colorTheme: 'gold',
        intensity: RitualIntensity.MODERATE,
        decorativeLevel: 'moderate'
      };

      orchestrator.applyRitualStyling(mockElement, style);

      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-element');
      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-theme-gold');
      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-intensity-2');
      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-decoration-moderate');
    });

    it('should apply cultural context styling', () => {
      const style: RitualStyle = {
        colorTheme: 'divine',
        intensity: RitualIntensity.DRAMATIC,
        decorativeLevel: 'ornate',
        culturalContext: 'eastern'
      };

      orchestrator.applyRitualStyling(mockElement, style);

      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-culture-eastern');
    });

    it('should apply accessibility mode styling', () => {
      const style: RitualStyle = {
        colorTheme: 'blue',
        intensity: RitualIntensity.SUBTLE,
        decorativeLevel: 'minimal',
        accessibilityMode: true
      };

      orchestrator.applyRitualStyling(mockElement, style);

      expect(mockElement.classList.add).toHaveBeenCalledWith('ritual-accessibility');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('animation', 'none');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('box-shadow', 'none');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('text-shadow', 'none');
    });

    it('should set intensity-specific CSS properties', () => {
      const style: RitualStyle = {
        colorTheme: 'purple',
        intensity: RitualIntensity.EPIC,
        decorativeLevel: 'epic'
      };

      orchestrator.applyRitualStyling(mockElement, style);

      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--ritual-local-opacity', '1.0');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--ritual-local-scale', '1.1');
    });
  });

  describe('animateTransition', () => {
    it('should create transition animation', () => {
      const mockAnimation = {
        addEventListener: jest.fn()
      };
      
      (document.body.animate as jest.Mock).mockReturnValue(mockAnimation);

      const animation = orchestrator.animateTransition({}, {}, 0.5);

      expect(document.body.animate).toHaveBeenCalled();
      expect(mockAnimation.addEventListener).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    it('should use correct animation options', () => {
      orchestrator.animateTransition({}, {}, 1.2);

      expect(document.body.animate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          duration: 1200, // 1.2 seconds in milliseconds
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        })
      );
    });
  });

  describe('scene management', () => {
    it('should track active scenes', () => {
      const scene1 = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.MODERATE);
      const scene2 = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.DRAMATIC);

      const activeScenes = orchestrator.getActiveScenes();
      
      expect(activeScenes).toHaveLength(2);
      expect(activeScenes).toContain(scene1);
      expect(activeScenes).toContain(scene2);
    });

    it('should cleanup scenes', () => {
      const scene = orchestrator.createRitualScene(RitualType.CREATION, RitualIntensity.MODERATE);
      
      expect(orchestrator.getActiveScenes()).toHaveLength(1);
      
      orchestrator.cleanupScene(scene.id);
      
      expect(orchestrator.getActiveScenes()).toHaveLength(0);
    });
  });

  describe('element generation', () => {
    it('should generate appropriate elements for welcome ritual', () => {
      const scene = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.DRAMATIC);
      
      const bgElement = scene.elements.find(el => el.id === 'welcome-bg-glow');
      const borderElement = scene.elements.find(el => el.id === 'welcome-border');
      const particlesElement = scene.elements.find(el => el.id === 'welcome-particles');
      
      expect(bgElement).toBeDefined();
      expect(borderElement).toBeDefined();
      expect(particlesElement).toBeDefined(); // Should have particles at DRAMATIC intensity
    });

    it('should generate fewer elements for subtle intensity', () => {
      const subtleScene = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.SUBTLE);
      const dramaticScene = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.DRAMATIC);
      
      expect(subtleScene.elements.length).toBeLessThan(dramaticScene.elements.length);
    });

    it('should include animations for appropriate elements', () => {
      const scene = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.MODERATE);
      
      const animatedElements = scene.elements.filter(el => el.animation);
      expect(animatedElements.length).toBeGreaterThan(0);
      
      animatedElements.forEach(element => {
        expect(element.animation).toHaveProperty('name');
        expect(element.animation).toHaveProperty('duration');
        expect(element.animation).toHaveProperty('easing');
      });
    });
  });

  describe('transitions', () => {
    it('should generate appropriate transitions', () => {
      const scene = orchestrator.createRitualScene(RitualType.TRANSITION, RitualIntensity.MODERATE);
      
      expect(scene.transitions).toHaveLength(3); // opacity, transform, box-shadow
      
      const opacityTransition = scene.transitions.find(t => t.property === 'opacity');
      const transformTransition = scene.transitions.find(t => t.property === 'transform');
      
      expect(opacityTransition).toBeDefined();
      expect(transformTransition).toBeDefined();
    });

    it('should include more transitions for higher intensity', () => {
      const subtleScene = orchestrator.createRitualScene(RitualType.MILESTONE, RitualIntensity.SUBTLE);
      const dramaticScene = orchestrator.createRitualScene(RitualType.MILESTONE, RitualIntensity.DRAMATIC);
      
      expect(dramaticScene.transitions.length).toBeGreaterThanOrEqual(subtleScene.transitions.length);
    });
  });

  describe('accessibility', () => {
    it('should handle accessibility mode properly', () => {
      const accessibleStyle: RitualStyle = {
        colorTheme: 'neutral',
        intensity: RitualIntensity.SUBTLE,
        decorativeLevel: 'minimal',
        accessibilityMode: true
      };

      orchestrator.applyRitualStyling(mockElement, accessibleStyle);

      // Should disable animations and effects
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('animation', 'none');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('box-shadow', 'none');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('filter', 'contrast(1.2)');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const scene1 = orchestrator.createRitualScene(RitualType.WELCOME, RitualIntensity.MODERATE);
      const scene2 = orchestrator.createRitualScene(RitualType.ACHIEVEMENT, RitualIntensity.DRAMATIC);

      expect(orchestrator.getActiveScenes()).toHaveLength(2);

      orchestrator.destroy();

      expect(orchestrator.getActiveScenes()).toHaveLength(0);
    });
  });
});
