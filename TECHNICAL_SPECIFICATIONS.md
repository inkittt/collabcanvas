# CollabCanvas - Technical Specifications

## 🔧 Detailed Implementation Guide

### Core Architecture Patterns

#### 1. Real-time Data Flow (WebSocket)
```javascript
// WebSocket subscription pattern
const subscribeToCanvas = (canvasId, callbacks) => {
  // Join canvas room
  WebSocketService.joinCanvas(canvasId);

  // Set up event listeners
  WebSocketService.onElementAdded(callbacks.onElementAdded);
  WebSocketService.onElementUpdated(callbacks.onElementUpdated);
  WebSocketService.onElementDeleted(callbacks.onElementDeleted);
  WebSocketService.onUserJoined(callbacks.onUserJoined);
  WebSocketService.onUserLeft(callbacks.onUserLeft);
  WebSocketService.onCursorMove(callbacks.onCursorMove);

  // Return cleanup function
  return () => {
    WebSocketService.leaveCanvas(canvasId);
    // Remove specific listeners if needed
  };
};
```

#### 2. Canvas Service Pattern
```javascript
// Service layer for canvas operations
class CanvasService {
  static async createCanvas(canvasData) {
    const { data, error } = await supabase
      .from('canvases')
      .insert([{
        name: canvasData.name,
        owner_id: supabase.auth.user()?.id,
        is_public: canvasData.isPublic || false
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  static async addElement(canvasId, elementData) {
    const { data, error } = await supabase
      .from('elements')
      .insert([{
        canvas_id: canvasId,
        user_id: supabase.auth.user()?.id,
        element_type: elementData.type,
        data: elementData.data
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
```

#### 3. Authentication Context Pattern
```javascript
// Authentication context implementation
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Fabric.js Canvas Integration

#### Canvas Initialization
```javascript
// Canvas setup with Fabric.js
const initializeCanvas = (canvasElement) => {
  const fabric = new fabric.Canvas(canvasElement, {
    width: 800,
    height: 600,
    backgroundColor: 'white'
  });
  
  // Enable object selection and manipulation
  fabric.selection = true;
  fabric.preserveObjectStacking = true;
  
  // Add event listeners for real-time sync
  fabric.on('object:added', handleObjectAdded);
  fabric.on('object:modified', handleObjectModified);
  fabric.on('object:removed', handleObjectRemoved);
  
  return fabric;
};

// Real-time object synchronization
const handleObjectAdded = (e) => {
  const object = e.target;
  if (!object.fromServer) {
    // Send to server
    CanvasService.addElement(canvasId, {
      type: object.type,
      data: object.toObject()
    });
  }
};
```

#### Drawing Tools Implementation
```javascript
// Drawing tools configuration
const drawingTools = {
  pen: {
    mode: 'drawing',
    brush: new fabric.PencilBrush(),
    width: 2,
    color: '#000000'
  },
  rectangle: {
    mode: 'shape',
    factory: (pointer) => new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      width: 100,
      height: 100,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2
    })
  },
  circle: {
    mode: 'shape',
    factory: (pointer) => new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 50,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2
    })
  }
};
```

### Database Schema Details

#### RLS Policies Implementation
```sql
-- Canvas access policy (prevents infinite recursion)
CREATE POLICY "canvas_access_policy" ON public.canvases
FOR SELECT USING (
  owner_id = auth.uid() OR 
  is_public = true OR 
  EXISTS (
    SELECT 1 FROM public.canvas_collaborators cc 
    WHERE cc.canvas_id = canvases.id 
    AND cc.user_id = auth.uid()
  )
);

-- Elements policy
CREATE POLICY "elements_access_policy" ON public.elements
FOR ALL USING (
  canvas_id IN (
    SELECT id FROM public.canvases 
    WHERE owner_id = auth.uid() OR is_public = true
  ) OR
  canvas_id IN (
    SELECT canvas_id FROM public.canvas_collaborators 
    WHERE user_id = auth.uid()
  )
);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.elements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_collaborators;
```

#### Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_elements_canvas_id ON public.elements(canvas_id);
CREATE INDEX idx_elements_created_at ON public.elements(created_at);
CREATE INDEX idx_canvas_collaborators_canvas_id ON public.canvas_collaborators(canvas_id);
CREATE INDEX idx_canvas_collaborators_user_id ON public.canvas_collaborators(user_id);
CREATE INDEX idx_canvases_owner_id ON public.canvases(owner_id);
CREATE INDEX idx_canvases_is_public ON public.canvases(is_public);
```

### Component Architecture

#### Canvas Editor Component Structure
```javascript
const CanvasEditor = ({ canvasId }) => {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [elements, setElements] = useState([]);
  const canvasRef = useRef(null);
  
  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = initializeCanvas(canvasRef.current);
      setFabricCanvas(canvas);
      
      return () => canvas.dispose();
    }
  }, []);
  
  // Load existing elements
  useEffect(() => {
    if (canvasId && fabricCanvas) {
      loadCanvasElements(canvasId, fabricCanvas);
    }
  }, [canvasId, fabricCanvas]);
  
  // Real-time subscriptions
  useEffect(() => {
    if (canvasId) {
      const subscription = subscribeToCanvas(
        canvasId,
        handleElementChange,
        handlePresenceChange
      );
      
      return () => subscription.unsubscribe();
    }
  }, [canvasId]);
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <ToolPanel 
        selectedTool={selectedTool}
        onToolChange={setSelectedTool}
        canvas={fabricCanvas}
      />
      <Box sx={{ flex: 1, position: 'relative' }}>
        <canvas ref={canvasRef} />
        <PresenceIndicators users={activeUsers} />
      </Box>
      <PropertiesPanel 
        selectedObject={selectedObject}
        canvas={fabricCanvas}
      />
    </Box>
  );
};
```

### Error Handling Patterns

#### Network Error Recovery
```javascript
// Retry mechanism for network operations
const withRetry = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
};

// Usage in service calls
const saveElement = async (elementData) => {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('elements')
      .insert([elementData]);
    
    if (error) throw error;
    return data;
  });
};
```

#### Optimistic Updates
```javascript
// Optimistic update pattern
const addElementOptimistically = async (elementData) => {
  const tempId = `temp_${Date.now()}`;
  const optimisticElement = { ...elementData, id: tempId };
  
  // Add to local state immediately
  setElements(prev => [...prev, optimisticElement]);
  
  try {
    // Save to server
    const savedElement = await CanvasService.addElement(canvasId, elementData);
    
    // Replace optimistic element with real one
    setElements(prev => 
      prev.map(el => el.id === tempId ? savedElement : el)
    );
  } catch (error) {
    // Remove optimistic element on error
    setElements(prev => prev.filter(el => el.id !== tempId));
    showErrorMessage('Failed to add element');
  }
};
```

### Performance Optimizations

#### Canvas Rendering Optimization
```javascript
// Debounced canvas updates
const debouncedSave = useMemo(
  () => debounce(async (canvasData) => {
    await CanvasService.saveCanvasState(canvasId, canvasData);
  }, 1000),
  [canvasId]
);

// Efficient object rendering
const renderObjects = useCallback((objects) => {
  fabricCanvas.clear();
  
  // Batch object additions
  const fabricObjects = objects.map(obj => 
    fabric.util.enlivenObjects([obj.data], (objects) => {
      fabricCanvas.add(...objects);
    })
  );
  
  fabricCanvas.renderAll();
}, [fabricCanvas]);
```

#### Memory Management
```javascript
// Cleanup subscriptions and resources
useEffect(() => {
  return () => {
    // Cleanup Fabric.js canvas
    if (fabricCanvas) {
      fabricCanvas.dispose();
    }
    
    // Cleanup Supabase subscriptions
    if (subscription) {
      subscription.unsubscribe();
    }
    
    // Clear intervals/timeouts
    if (saveInterval) {
      clearInterval(saveInterval);
    }
  };
}, []);
```

### Testing Strategies

#### Unit Testing Components
```javascript
// Test canvas component
describe('CanvasEditor', () => {
  it('should initialize fabric canvas', () => {
    render(<CanvasEditor canvasId="test-id" />);
    expect(screen.getByRole('canvas')).toBeInTheDocument();
  });
  
  it('should handle tool selection', () => {
    const { getByTestId } = render(<CanvasEditor canvasId="test-id" />);
    fireEvent.click(getByTestId('pen-tool'));
    expect(getByTestId('pen-tool')).toHaveClass('selected');
  });
});
```

#### Integration Testing
```javascript
// Test real-time functionality
describe('Real-time collaboration', () => {
  it('should sync element additions', async () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };
    
    supabase.channel = jest.fn().mockReturnValue(mockChannel);
    
    render(<CanvasEditor canvasId="test-id" />);
    
    // Simulate element addition from another user
    const elementChange = {
      eventType: 'INSERT',
      new: { id: '1', type: 'rect', data: {} }
    };
    
    // Trigger the callback
    const onElementChange = mockChannel.on.mock.calls[0][2];
    onElementChange(elementChange);
    
    await waitFor(() => {
      expect(screen.getByTestId('canvas-element-1')).toBeInTheDocument();
    });
  });
});
```

---

This technical specification provides the detailed implementation patterns and code examples needed to recreate the CollabCanvas project's core functionality.
