import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, ArrowLeft, Loader2, Mail, MailOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';
import { format } from 'date-fns';

export default function Messages() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [composing, setComposing] = useState(false);
  const [composeForm, setComposeForm] = useState({
    recipient_email: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated', error);
        base44.auth.redirectToLogin(window.location.origin + createPageUrl('Messages'));
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  // Check URL parameters for pre-filled compose form
  useEffect(() => {
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const toEmail = urlParams.get('to');
    const subject = urlParams.get('subject');
    
    if (toEmail) {
      setComposeForm({
        recipient_email: decodeURIComponent(toEmail),
        subject: subject ? decodeURIComponent(subject) : '',
        content: ''
      });
      setComposing(true);
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  // Fetch all messages where user is sender or recipient
  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ['messages', user?.email],
    queryFn: async () => {
      if (!user) return [];
      try {
        // Fetch all messages
        const messages = await base44.entities.Message.list('-created_date');
        // Filter to only messages involving this user
        return messages.filter(m => 
          m.sender_email === user.email || m.recipient_email === user.email
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setReplyContent('');
      setComposeForm({ recipient_email: '', subject: '', content: '' });
      setComposing(false);
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    },
    onError: (error) => {
      console.error('Failed to mark as read:', error);
    }
  });

  // Group messages by thread
  const groupByThread = (messages) => {
    const threads = {};
    messages.forEach(msg => {
      const threadId = msg.thread_id || msg.id;
      if (!threads[threadId]) {
        threads[threadId] = [];
      }
      threads[threadId].push(msg);
    });
    return threads;
  };

  const receivedMessages = allMessages.filter(m => m.recipient_email === user?.email);
  const sentMessages = allMessages.filter(m => m.sender_email === user?.email);
  const unreadCount = receivedMessages.filter(m => !m.is_read).length;

  const receivedThreads = groupByThread(receivedMessages);
  const sentThreads = groupByThread(sentMessages);

  const getThreadPreview = (threadMessages) => {
    const sortedMessages = [...threadMessages].sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    return sortedMessages[0];
  };

  const handleThreadClick = (threadId, messages) => {
    setSelectedThread({ threadId, messages: messages.sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    )});
    
    // Mark all unread messages in thread as read
    messages.forEach(msg => {
      if (msg.recipient_email === user.email && !msg.is_read) {
        markAsReadMutation.mutate(msg.id);
      }
    });
  };

  const handleReply = () => {
    if (!replyContent.trim() || !selectedThread) return;

    const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
    const recipientEmail = lastMessage.sender_email === user.email 
      ? lastMessage.recipient_email 
      : lastMessage.sender_email;
    const recipientName = lastMessage.sender_email === user.email
      ? lastMessage.recipient_name
      : lastMessage.sender_name;

    sendMessageMutation.mutate({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: lastMessage.subject,
      content: replyContent,
      thread_id: selectedThread.threadId,
      reference_type: lastMessage.reference_type,
      reference_id: lastMessage.reference_id,
      parent_message_id: lastMessage.id,
      is_read: false
    });
  };

  const handleSendNewMessage = () => {
    if (!composeForm.recipient_email.trim() || !composeForm.subject.trim() || !composeForm.content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const threadId = `new_${Date.now()}_${user.email}`;

    sendMessageMutation.mutate({
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      recipient_email: composeForm.recipient_email,
      recipient_name: composeForm.recipient_email,
      subject: composeForm.subject,
      content: composeForm.content,
      thread_id: threadId,
      is_read: false
    });
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // Compose new message view
  if (composing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={user} />
        
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setComposing(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">New Message</h1>
                <p className="text-sm text-gray-600">Send a message</p>
              </div>
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label>To (Email) *</Label>
                  <Input
                    type="email"
                    value={composeForm.recipient_email}
                    onChange={(e) => setComposeForm({ ...composeForm, recipient_email: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                </div>

                <div>
                  <Label>Subject *</Label>
                  <Input
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    placeholder="What is this about?"
                  />
                </div>

                <div>
                  <Label>Message *</Label>
                  <Textarea
                    value={composeForm.content}
                    onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                    placeholder="Type your message here..."
                    rows={8}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setComposing(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSendNewMessage}
                    disabled={!composeForm.recipient_email.trim() || !composeForm.subject.trim() || !composeForm.content.trim() || sendMessageMutation.isLoading}
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                  >
                    {sendMessageMutation.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Thread view
  if (selectedThread) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={user} />
        
        <div className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setSelectedThread(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">
                  {selectedThread.messages[0].subject}
                </h1>
                <p className="text-sm text-gray-600">
                  Conversation with {selectedThread.messages[0].sender_email === user.email 
                    ? selectedThread.messages[0].recipient_name 
                    : selectedThread.messages[0].sender_name}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {selectedThread.messages.map((msg) => {
                const isSender = msg.sender_email === user.email;
                return (
                  <Card key={msg.id} className={`p-4 ${isSender ? 'bg-blue-50 ml-12' : 'bg-white mr-12'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${isSender ? 'bg-[#1e3a5f]' : 'bg-gray-400'} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">
                            {isSender ? 'You' : msg.sender_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Reply</h3>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                className="mb-4"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleReply}
                  disabled={!replyContent.trim() || sendMessageMutation.isLoading}
                  className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                >
                  {sendMessageMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Reply
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main inbox/sent view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a5f]">Messages</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600">
                    {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={() => setComposing(true)}
              className="bg-[#d4af37] hover:bg-[#c49d2a]"
            >
              <Send className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="inbox" className="relative">
                Inbox
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox">
              {isLoading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
                </div>
              ) : Object.keys(receivedThreads).length === 0 ? (
                <Card className="p-12 text-center">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-600">
                    When someone contacts you about your deals or services, messages will appear here
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {Object.entries(receivedThreads).map(([threadId, messages]) => {
                    const preview = getThreadPreview(messages);
                    const hasUnread = messages.some(m => !m.is_read && m.recipient_email === user.email);
                    
                    return (
                      <Card 
                        key={threadId}
                        className={`p-4 cursor-pointer hover:shadow-lg transition-shadow ${hasUnread ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                        onClick={() => handleThreadClick(threadId, messages)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${hasUnread ? 'text-[#1e3a5f]' : 'text-gray-900'}`}>
                                  {preview.sender_name}
                                </span>
                                {hasUnread && (
                                  <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {format(new Date(preview.created_date), 'MMM d')}
                              </span>
                            </div>
                            <h3 className={`text-sm mb-1 ${hasUnread ? 'font-semibold' : ''}`}>
                              {preview.subject}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {preview.content}
                            </p>
                            {messages.length > 1 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {messages.length} messages
                              </p>
                            )}
                          </div>
                          {hasUnread ? (
                            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <MailOpen className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent">
              {isLoading ? (
                <div className="text-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
                </div>
              ) : Object.keys(sentThreads).length === 0 ? (
                <Card className="p-12 text-center">
                  <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No sent messages</h3>
                  <p className="text-gray-600">
                    Messages you send will appear here
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {Object.entries(sentThreads).map(([threadId, messages]) => {
                    const preview = getThreadPreview(messages);
                    
                    return (
                      <Card 
                        key={threadId}
                        className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleThreadClick(threadId, messages)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[#1e3a5f] rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-semibold text-gray-900">
                                To: {preview.recipient_name}
                              </span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {format(new Date(preview.created_date), 'MMM d')}
                              </span>
                            </div>
                            <h3 className="text-sm mb-1">{preview.subject}</h3>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {preview.content}
                            </p>
                            {messages.length > 1 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {messages.length} messages
                              </p>
                            )}
                          </div>
                          <Send className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}