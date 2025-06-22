# **App Blueprint: CollabCanvas**  

## **1. Project Breakdown**  
- **App Name:** CollabCanvas  
- **Platform:** Web  
- **Summary:** CollabCanvas is a real-time collaborative image editing platform designed for both amateurs and professionals. It enables seamless teamwork with Operational Transformation (OT) and Conflict-Free Replicated Data Types (CRDTs) to resolve edit conflicts while maintaining data consistency. The app includes a minimalist dashboard, live chat, and WebRTC-powered video calls for real-time discussions. Built with React.js (Next.js) and Supabase, it prioritizes accessibility, performance, and user feedback-driven improvements.  
- **Primary Use Case:** Teams or individuals collaborating on image editing projects in real-time with conflict resolution, chat, and video call support.  
- **Authentication Requirements:** Email/password login, Google OAuth, and guest access (read-only mode).  

---  

## **2. Tech Stack Overview**
- **Frontend Framework:** React + Next.js (App Router)
- **UI Library:** Tailwind CSS + ShadCN (for pre-built, accessible components)
- **Backend:** Supabase (PostgreSQL for data storage, auth, real-time collaboration)
- **Deployment:** Vercel (serverless functions, edge caching)

---  

## **3. Core Features**  
1. **Real-Time Collaborative Editing**  
   - OT/CRDT-based conflict resolution for overlapping edits.  
   - Multi-user brush strokes, filters, and layer adjustments synced instantly.  

2. **User Authentication & Permissions**  
   - Email/password, Google OAuth, and guest access.  
   - Role-based permissions (owner, editor, viewer).  

3. **Project Dashboard**  
   - Create/join editing spaces with public/private toggles.  
   - Invite collaborators via email or generated access codes.  

4. **Split-Screen Workspace**  
   - **Left Panel:** Canvas with editing tools (brushes, filters, layers).  
   - **Right Panel:** Real-time chat and collaborator list.  

5. **WebRTC Video Calls**  
   - Floating video call window for discussions.  
   - Screen-sharing support.  

6. **Undo/Redo & Version History**  
   - OT-based undo/redo stack.  
   - Supabase storage for version snapshots.  

7. **Community Chat & Notifications**  
   - Global and project-specific chat channels.  
   - Real-time notifications for edits and messages.  

---  

## **4. User Flow**  
1. **Landing Page → Login/Signup (or Guest Access)**  
2. **Dashboard → Create/Join Project**  
   - Set privacy (public/private).  
   - Invite collaborators.  
3. **Editing Workspace**  
   - Left panel: Edit canvas with tools.  
   - Right panel: Chat, collaborators, video call button.  
4. **Save & Export**  
   - Download in PNG/JPG/SVG.  
   - Store revisions in Supabase.  

---  

## **5. Design & UI/UX Guidelines**  
- **Minimalist Aesthetic:** Neutral colors (Slate/Tailwind grayscale) with accent colors for interactive elements.  
- **Responsive Layout:**  
   - Desktop: Split-screen (70% canvas, 30% chat).  
   - Mobile: Toggle between canvas and chat.  
- **Accessibility:**  
   - Keyboard shortcuts for tools (e.g., `B` for brush).  
   - High-contrast mode via Tailwind's dark/light toggle.  
- **Micro-interactions:**  
   - Smooth transitions when switching tools.  
   - Loading skeletons for real-time updates.  

---  

## **6. Technical Implementation**  
### **Frontend (Next.js + Tailwind + ShadCN)**
- **Canvas:** `<canvas>` with Fabric.js for drawing tools.
- **Real-Time Sync:** Supabase Realtime for live collaboration and canvas updates.
- **UI Components:**
   - ShadCN for modals, tooltips, and dropdowns.
   - Custom hooks for undo/redo (storing edit history in Zustand).

### **Backend (Supabase)**
- **Auth:** `supabase.auth` for OAuth and email/password.
- **Database:** PostgreSQL tables for:
   - `projects` (id, owner_id, privacy_mode).
   - `collaborators` (user_id, project_id, role).
   - `canvas_elements` (id, project_id, element_data, position, user_id, updated_at).
  - `chat_messages` (id, project_id, user_id, message, created_at).
- **Realtime:** Supabase Realtime subscriptions for live canvas updates, chat, and collaboration.

### **WebRTC (Video Calls)**
- Use `simple-peer` wrapped in a custom hook.
- Store call links in Supabase `calls` table.  

### **Deployment (Vercel)**  
- Next.js API routes for serverless functions.  
- Edge caching for static assets.  

---  

## **7. Development Tools & Setup**  
### **Required Tools**  
- Node.js (v18+)  
- Supabase CLI (`npm install -g supabase`)  
- Git  

### **Setup Instructions**  
1. Clone repo:  
   ```bash  
   git clone https://github.com/your-repo/collabcanvas.git  
   cd collabcanvas  
   ```  
2. Install dependencies:  
   ```bash  
   npm install  
   ```  
3. Set up Supabase:  
   - Run `supabase init`.  
   - Link to your Supabase project.  
   - Enable Realtime and Row-Level Security (RLS).  
4. Configure `.env.local`:  
   ```env  
   NEXT_PUBLIC_SUPABASE_URL=your-url  
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key  
   ```  
5. Run dev server:  
   ```bash  
   npm run dev  
   ```  

---  

### **Future Expansions**  
- 3D modeling tools via Three.js.  
- Mobile app (React Native + Expo).  
- AI-assisted editing (Supabase Edge Functions).  

This blueprint ensures a scalable, real-time collaborative editor using only the specified stack (Next.js, Supabase, Tailwind). Let me know if you need refinements! 🚀