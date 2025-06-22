import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ElementService } from '../services/elementService';

const RealtimeTest = () => {
  const [status, setStatus] = useState('Initializing...');
  const [elements, setElements] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [log, setLog] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    initializeRealtime();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const initializeRealtime = async () => {
    const canvasId = 'd28642c3-6c2b-4811-9486-f36590be52f6'; // Test canvas ID
    
    addLog('🚀 Starting realtime test...');
    
    try {
      // Load existing elements
      const existingElements = await ElementService.getCanvasElements(canvasId);
      setElements(existingElements);
      addLog(`📦 Loaded ${existingElements.length} existing elements`);

      // Set up realtime subscription
      const channel = supabase
        .channel(`test-elements-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'elements',
          filter: `canvas_id=eq.${canvasId}`
        }, (payload) => {
          addLog(`🔥 REALTIME EVENT: ${payload.eventType}`);
          addLog(`📄 Data: ${JSON.stringify(payload.new || payload.old)}`);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setElements(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setElements(prev => prev.map(el => 
              el.id === payload.new.id ? payload.new : el
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setElements(prev => prev.filter(el => el.id !== payload.old.id));
          }
        })
        .subscribe((status) => {
          addLog(`📡 Subscription status: ${status}`);
          setStatus(status);
        });

      setSubscription(channel);
    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      setStatus('Error');
    }
  };

  const testDirectUpdate = async () => {
    addLog('🧪 Testing direct database update...');
    
    try {
      const randomX = Math.floor(Math.random() * 500);
      const randomY = Math.floor(Math.random() * 400);
      
      const { data, error } = await supabase
        .from('elements')
        .update({ 
          position: { x: randomX, y: randomY },
          updated_at: new Date().toISOString()
        })
        .eq('id', '1170c679-a9ad-48df-a5eb-7790a2594d7b')
        .select();

      if (error) {
        addLog(`❌ Update error: ${error.message}`);
      } else {
        addLog(`✅ Updated element position to (${randomX}, ${randomY})`);
      }
    } catch (err) {
      addLog(`❌ Exception: ${err.message}`);
    }
  };

  const testElementService = async () => {
    addLog('🧪 Testing ElementService update...');
    
    try {
      const randomX = Math.floor(Math.random() * 500);
      const randomY = Math.floor(Math.random() * 400);
      
      const result = await ElementService.updateElement('1170c679-a9ad-48df-a5eb-7790a2594d7b', {
        position: { x: randomX, y: randomY },
        data: { left: randomX, top: randomY }
      });

      if (result.conflict) {
        addLog(`⚠️ Conflict detected: ${result.message}`);
      } else {
        addLog(`✅ ElementService updated position to (${randomX}, ${randomY})`);
      }
    } catch (err) {
      addLog(`❌ ElementService error: ${err.message}`);
    }
  };

  const clearLog = () => {
    setLog([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Realtime Test Component</h1>
      
      <div style={{ 
        padding: '10px', 
        marginBottom: '20px', 
        borderRadius: '5px',
        backgroundColor: status === 'SUBSCRIBED' ? '#d4edda' : '#f8d7da',
        color: status === 'SUBSCRIBED' ? '#155724' : '#721c24'
      }}>
        Status: {status === 'SUBSCRIBED' ? '🟢 Connected' : '🔴 ' + status}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testDirectUpdate}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Direct DB Update
        </button>
        
        <button 
          onClick={testElementService}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test ElementService Update
        </button>
        
        <button 
          onClick={clearLog}
          style={{ 
            padding: '10px 20px', 
            margin: '5px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Clear Log
        </button>
      </div>

      <div>
        <h3>Elements ({elements.length}):</h3>
        <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '10px' }}>
          {elements.map(element => (
            <div key={element.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
              {element.element_type} - Position: {JSON.stringify(element.position)} - Updated: {element.updated_at}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3>Log:</h3>
        <div style={{ 
          height: '300px', 
          overflow: 'auto', 
          border: '1px solid #ddd', 
          padding: '10px', 
          backgroundColor: '#f8f9fa',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {log.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RealtimeTest;
