// Real-time Canvas Collaboration with Supabase Realtime
// This example shows how to implement real-time element movement

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hdbwuqvftasbmqtuyzwm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk'

const supabase = createClient(supabaseUrl, supabaseKey)

class RealtimeCanvas {
  constructor(canvasId, userId) {
    this.canvasId = canvasId
    this.userId = userId
    this.elements = new Map() // Store canvas elements
    this.subscription = null
    this.isMoving = false
    this.currentElement = null
  }

  // Initialize real-time subscription
  async initialize() {
    // Subscribe to element changes for this canvas
    this.subscription = supabase
      .channel(`canvas:${this.canvasId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${this.canvasId}`
      }, (payload) => {
        this.handleElementChange(payload)
      })
      .subscribe()

    // Load existing elements
    await this.loadElements()
    
    console.log(`✅ Real-time canvas initialized for canvas: ${this.canvasId}`)
  }

  // Load existing elements from database
  async loadElements() {
    const { data: elements, error } = await supabase
      .from('elements')
      .select('*')
      .eq('canvas_id', this.canvasId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading elements:', error)
      return
    }

    elements.forEach(element => {
      this.elements.set(element.id, element)
      this.renderElement(element)
    })
  }

  // Handle real-time element changes
  handleElementChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        this.elements.set(newRecord.id, newRecord)
        this.renderElement(newRecord)
        console.log(`🆕 New element added by user: ${newRecord.user_id}`)
        break

      case 'UPDATE':
        // Don't update if this user is currently moving the element
        if (this.isMoving && this.currentElement?.id === newRecord.id) {
          return
        }
        
        this.elements.set(newRecord.id, newRecord)
        this.updateElementPosition(newRecord)
        console.log(`🔄 Element updated by user: ${newRecord.last_modified_by}`)
        break

      case 'DELETE':
        this.elements.delete(oldRecord.id)
        this.removeElement(oldRecord.id)
        console.log(`🗑️ Element deleted: ${oldRecord.id}`)
        break
    }
  }

  // Move element (called when user drags an element)
  async moveElement(elementId, newPosition) {
    this.isMoving = true
    this.currentElement = this.elements.get(elementId)

    try {
      // Update position in database - this will trigger real-time updates for other users
      const { data, error } = await supabase.rpc('update_element_position', {
        element_id: elementId,
        new_position: newPosition,
        modifier_user_id: this.userId
      })

      if (error) {
        console.error('Error updating element position:', error)
        return
      }

      // Update local element immediately for smooth UX
      if (this.currentElement) {
        this.currentElement.position = newPosition
        this.currentElement.data = { ...this.currentElement.data, position: newPosition }
        this.elements.set(elementId, this.currentElement)
      }

    } finally {
      // Reset moving state after a short delay
      setTimeout(() => {
        this.isMoving = false
        this.currentElement = null
      }, 100)
    }
  }

  // Create new element
  async createElement(elementType, elementData, position) {
    try {
      const { data, error } = await supabase.rpc('create_canvas_element', {
        canvas_id_param: this.canvasId,
        element_type_param: elementType,
        element_data: elementData,
        pos_param: position,
        creator_user_id: this.userId
      })

      if (error) {
        console.error('Error creating element:', error)
        return null
      }

      return data[0]
    } catch (err) {
      console.error('Error creating element:', err)
      return null
    }
  }

  // Render element on canvas (implement based on your canvas library)
  renderElement(element) {
    console.log(`🎨 Rendering element:`, element)
    // TODO: Implement actual canvas rendering logic
    // This could be Fabric.js, Konva.js, or HTML5 Canvas
    
    // Example with Fabric.js:
    // const fabricObject = new fabric.Rect({
    //   left: element.position.x,
    //   top: element.position.y,
    //   width: element.data.width,
    //   height: element.data.height,
    //   fill: element.data.color
    // })
    // canvas.add(fabricObject)
  }

  // Update element position on canvas
  updateElementPosition(element) {
    console.log(`📍 Updating element position:`, element.id, element.position)
    // TODO: Implement position update logic
    
    // Example with Fabric.js:
    // const fabricObject = canvas.getObjects().find(obj => obj.id === element.id)
    // if (fabricObject) {
    //   fabricObject.set({
    //     left: element.position.x,
    //     top: element.position.y
    //   })
    //   canvas.renderAll()
    // }
  }

  // Remove element from canvas
  removeElement(elementId) {
    console.log(`🗑️ Removing element:`, elementId)
    // TODO: Implement element removal logic
  }

  // Clean up subscription
  destroy() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
    }
  }
}

// Usage Example:
// const canvas = new RealtimeCanvas('your-canvas-id', 'your-user-id')
// await canvas.initialize()

// // When user moves an element:
// canvas.moveElement('element-id', { x: 100, y: 200 })

// // When user creates a new element:
// canvas.createElement('rectangle', { width: 50, height: 30, color: '#ff0000' }, { x: 150, y: 100 })

export default RealtimeCanvas
