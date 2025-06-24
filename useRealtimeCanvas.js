// React Hook for Real-time Canvas Collaboration
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hdbwuqvftasbmqtuyzwm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk'

const supabase = createClient(supabaseUrl, supabaseKey)

export const useRealtimeCanvas = (canvasId, userId) => {
  const [elements, setElements] = useState(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState([])
  const subscriptionRef = useRef(null)
  const isMovingRef = useRef(false)
  const currentElementRef = useRef(null)

  // Load initial elements
  const loadElements = useCallback(async () => {
    if (!canvasId) return;

    try {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const elementsMap = new Map();
      data.forEach(element => {
        elementsMap.set(element.id, element);
      });
      setElements(elementsMap);
    } catch (error) {
      console.error('Error loading elements:', error);
    }
  }, [canvasId]);

  // Handle real-time changes
  const handleElementChange = useCallback((payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setElements(prevElements => {
      const newElements = new Map(prevElements);

      switch (eventType) {
        case 'INSERT':
          newElements.set(newRecord.id, newRecord);
          break;

        case 'UPDATE':
          // Don't update if this user is currently moving the element
          if (isMovingRef.current && currentElementRef.current?.id === newRecord.id) {
            return prevElements;
          }
          newElements.set(newRecord.id, newRecord);
          break;

        case 'DELETE':
          newElements.delete(oldRecord.id);
          break;
        default:
          break;
      }

      return newElements;
    });
  }, []);

  // Load initial elements when canvasId changes
  useEffect(() => {
    if (canvasId) {
      loadElements();
    }
  }, [canvasId, loadElements]);

  // Manage real-time subscription
  useEffect(() => {
    if (!canvasId || !userId) {
      return;
    }

    // Set up real-time subscription
    subscriptionRef.current = supabase
      .channel(`canvas:${canvasId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'elements',
          filter: `canvas_id=eq.${canvasId}`,
        },
        handleElementChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('✅ Connected to real-time canvas');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          console.error(`❌ Real-time connection error: ${status}`);
        }
      });

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
        console.log('🔌 Disconnected from real-time canvas');
      }
    };
  }, [canvasId, userId, handleElementChange]);

  // Move element function
  const moveElement = useCallback(async (elementId, newPosition) => {
    if (!elementId || !newPosition || !userId) return

    isMovingRef.current = true
    currentElementRef.current = elements.get(elementId)

    try {
      // Optimistic update for smooth UX
      setElements(prevElements => {
        const newElements = new Map(prevElements)
        const element = newElements.get(elementId)
        if (element) {
          const updatedElement = {
            ...element,
            position: newPosition,
            data: { ...element.data, position: newPosition },
            updated_at: new Date().toISOString()
          }
          newElements.set(elementId, updatedElement)
        }
        return newElements
      })

      // Update in database
      const { data, error } = await supabase.rpc('update_element_position', {
        element_id: elementId,
        new_position: newPosition,
        modifier_user_id: userId
      })

      if (error) {
        console.error('Error updating element position:', error)
        // Revert optimistic update on error
        await loadElements()
      }
    } finally {
      setTimeout(() => {
        isMovingRef.current = false
        currentElementRef.current = null
      }, 100)
    }
  }, [elements, userId, loadElements])

  // Create element function
  const createElement = useCallback(async (elementType, elementData, position) => {
    if (!canvasId || !userId) return null

    try {
      const { data, error } = await supabase.rpc('create_canvas_element', {
        canvas_id_param: canvasId,
        element_type_param: elementType,
        element_data: elementData,
        pos_param: position,
        creator_user_id: userId
      })

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error creating element:', error)
      return null
    }
  }, [canvasId, userId])

  // Delete element function
  const deleteElement = useCallback(async (elementId) => {
    if (!elementId) return

    try {
      const { error } = await supabase
        .from('elements')
        .delete()
        .eq('id', elementId)
        .eq('canvas_id', canvasId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting element:', error)
    }
  }, [canvasId])

  // Get elements as array for easier rendering
  const elementsArray = Array.from(elements.values())

  return {
    elements: elementsArray,
    elementsMap: elements,
    isConnected,
    collaborators,
    moveElement,
    createElement,
    deleteElement,
    loadElements
  }
}

// Example usage in a React component:
/*
function CanvasEditor({ canvasId, userId }) {
  const {
    elements,
    isConnected,
    moveElement,
    createElement,
    deleteElement
  } = useRealtimeCanvas(canvasId, userId)

  const handleElementDrag = (elementId, newPosition) => {
    moveElement(elementId, newPosition)
  }

  const handleCreateRectangle = () => {
    createElement('rectangle', {
      width: 100,
      height: 50,
      color: '#ff0000'
    }, {
      x: Math.random() * 400,
      y: Math.random() * 300
    })
  }

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <button onClick={handleCreateRectangle}>Add Rectangle</button>
      
      <div className="canvas-container">
        {elements.map(element => (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              left: element.position?.x || 0,
              top: element.position?.y || 0,
              width: element.data?.width || 50,
              height: element.data?.height || 50,
              backgroundColor: element.data?.color || '#ccc',
              cursor: 'move'
            }}
            onMouseDown={(e) => {
              // Implement drag logic here
              // Call handleElementDrag when dragging
            }}
          >
            {element.element_type}
          </div>
        ))}
      </div>
    </div>
  )
}
*/
