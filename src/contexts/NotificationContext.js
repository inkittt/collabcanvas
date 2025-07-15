import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NotificationService } from '../services/notificationService';
import { UserJoinNotificationContainer, useUserJoinNotifications } from '../components/Notifications/UserJoinNotification';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { notifications, addNotification, removeNotification } = useUserJoinNotifications();
  const notificationSubscriptionRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up global notification system for user:', user.id);

    // Set up notification subscription for the current user
    notificationSubscriptionRef.current = NotificationService.subscribeToUserJoinNotifications(
      user.id,
      (notification) => {
        console.log('🔔 Received global user join notification:', notification);
        addNotification(notification);
      }
    );

    // Also set up the PostgreSQL listener to handle database triggers
    const postgresSubscription = NotificationService.subscribeToPostgresNotifications(
      async (payload) => {
        console.log('🔔 PostgreSQL notification received:', payload);
        // The handleUserJoinedCanvas function will process this and send the notification
      }
    );

    return () => {
      console.log('🔔 Cleaning up global notification subscriptions');
      
      if (notificationSubscriptionRef.current) {
        notificationSubscriptionRef.current.unsubscribe();
        notificationSubscriptionRef.current = null;
      }
      
      if (postgresSubscription) {
        postgresSubscription.unsubscribe();
      }
    };
  }, [user?.id, addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Global notification container */}
      <UserJoinNotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
