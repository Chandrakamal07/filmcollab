"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  MoreHorizontal,
  Paperclip,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Music,
  Check,
  CheckCheck,
  Users,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Trash2,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateKeyPair, importPrivateKey, importPublicKey, deriveAESKey, encryptMessage, decryptMessage, encryptForRecipientOrThrow } from "@/lib/e2ee";

type MessageType = "text" | "image" | "video" | "document" | "audio";

interface ChatMessage {
  id: string;
  sender: "me" | "them";
  type: MessageType;
  content: string; // text, base64 data, or url
  timestamp: number;
  read: boolean;
  fileName?: string;
  failed?: boolean;
}

interface Conversation {
  id: string; // recipient profile ID
  username: string;
  avatar: string; // initials
  avatarUrl?: string | null;
  messages: ChatMessage[];
  unread: number;
  isOnline?: boolean;
}

interface ConnectedUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  avatarInitials: string;
  category: string;
}

// Database Interfaces to avoid "any"
interface DBProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  category: string | null;
  public_key?: string | null;
}

interface DBConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: string;
  profiles: DBProfile | null;
  sender_profile: DBProfile | null;
}

interface DBMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Standard Seed fallback data
const seedConversations: Conversation[] = [];
const seedContacts: ConnectedUser[] = [];

const isUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recipientParam = searchParams.get("recipient");
  const usernameParam = searchParams.get("u");

  // Local Storage & Hybrid states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [convSearch, setConvSearch] = useState("");
  const [input, setInput] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Reporting states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // E2EE States
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [e2eeReady, setE2eeReady] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFileType, setPendingFileType] = useState<MessageType>("image");

  // Determine current user ID and account-namespaced storage prefix
  const currentUserId = profile?.id || user?.id || "me";
  const storagePrefix = currentUserId && currentUserId !== "me" ? `_${currentUserId}` : "";

  // Handle URL parameters ?recipient=UUID or ?u=username
  useEffect(() => {
    const handleUrlRecipient = async () => {
      if (recipientParam && isUuid(recipientParam)) {
        setIsMobileChatOpen(true);
        let recProfile = null;
        const { data: byId } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, category")
          .eq("id", recipientParam)
          .maybeSingle();
        recProfile = byId;

        if (!recProfile) {
          const { data: byUserId } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, category")
            .eq("user_id", recipientParam)
            .maybeSingle();
          recProfile = byUserId;
        }

        if (!recProfile && usernameParam) {
          const { data: byUsername } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, category")
            .eq("username", usernameParam)
            .maybeSingle();
          recProfile = byUsername;
        }

        if (recProfile) {
          setActiveId(recProfile.id);
          const fullName = recProfile.full_name || recProfile.username || "Film Professional";
          const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          setConnectedUsers((prev) => {
            if (prev.some((u) => u.id === recProfile.id)) return prev;
            return [
              ...prev,
              {
                id: recProfile.id,
                username: recProfile.username || fullName.toLowerCase().replace(/\s+/g, ""),
                fullName,
                avatarUrl: recProfile.avatar_url,
                avatarInitials: initials || "U",
                category: recProfile.category || "Professional"
              }
            ];
          });
        } else {
          setActiveId(recipientParam);
        }
      } else if (usernameParam) {
        const { data: recProfile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, category")
          .eq("username", usernameParam)
          .maybeSingle();
        if (recProfile) {
          setActiveId(recProfile.id);
          setIsMobileChatOpen(true);
          const fullName = recProfile.full_name || recProfile.username || "Film Professional";
          const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          setConnectedUsers((prev) => {
            if (prev.some((u) => u.id === recProfile.id)) return prev;
            return [
              ...prev,
              {
                id: recProfile.id,
                username: recProfile.username || fullName.toLowerCase().replace(/\s+/g, ""),
                fullName,
                avatarUrl: recProfile.avatar_url,
                avatarInitials: initials || "U",
                category: recProfile.category || "Professional"
              }
            ];
          });
        }
      }
    };
    handleUrlRecipient();
  }, [recipientParam, usernameParam]);

  // E2EE Initialization
  useEffect(() => {
    const initE2EE = async () => {
      if (!user || !profile?.id) return;
      const isGuestSession = profile.id === "guest-profile-id" || profile.id === "admin-guest-profile";
      if (isGuestSession) return;

      try {
        let privKeyStr = localStorage.getItem(`e2ee_priv_${profile.id}`);
        let pubKeyStr = localStorage.getItem(`e2ee_pub_${profile.id}`);
        
        let privKey: CryptoKey;
        let pubKeyJwk: JsonWebKey;

        if (privKeyStr && pubKeyStr) {
          const jwk = JSON.parse(privKeyStr);
          pubKeyJwk = JSON.parse(pubKeyStr);
          privKey = await importPrivateKey(jwk);
        } else {
          // Generate new keys
          const keys = await generateKeyPair();
          privKeyStr = JSON.stringify(keys.privateKeyJwk);
          pubKeyStr = JSON.stringify(keys.publicKeyJwk);
          localStorage.setItem(`e2ee_priv_${profile.id}`, privKeyStr);
          localStorage.setItem(`e2ee_pub_${profile.id}`, pubKeyStr);
          pubKeyJwk = keys.publicKeyJwk;
          privKey = await importPrivateKey(keys.privateKeyJwk);

          // Attempt to save to Supabase. Ignore if column doesn't exist yet (for smooth rollout)
          await Promise.resolve(supabase.from("profiles").update({ public_key: pubKeyStr }).eq("id", profile.id)).catch(() => {});
        }

        setPrivateKey(privKey);
        setE2eeReady(true);
      } catch (err) {
        console.error("E2EE Init failed:", err);
      }
    };
    initE2EE();
  }, [user, profile?.id]);

  // Load and merge all data
  const loadLocalData = useCallback(() => {
    const saved = storagePrefix ? localStorage.getItem(`chat_conversations${storagePrefix}`) : null;
    let initialConvs = seedConversations;
    if (saved) {
      try {
        initialConvs = JSON.parse(saved);
      } catch (e) {
        initialConvs = seedConversations;
      }
    }
    setConversations(initialConvs);

    const updatedContacts = [...seedContacts];
    const redirectedId = localStorage.getItem("active_chat_recipient_id");
    if (redirectedId) {
      setActiveId(redirectedId);
      setIsMobileChatOpen(true);
      localStorage.removeItem("active_chat_recipient_id");

      // Verify if redirect target exists in contacts or connections
      const contactExists = updatedContacts.some(sc => sc.id === redirectedId) ||
                            initialConvs.some(c => c.id === redirectedId);
      if (!contactExists) {
        // Fetch from Supabase if we have a UUID
        if (isUuid(redirectedId)) {
          supabase.from("profiles").select("*").eq("id", redirectedId).single().then(({ data }) => {
            if (data) {
              const fullName = data.full_name || data.username || "Anonymous User";
              const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              setConnectedUsers(prev => [...prev, {
                id: data.id,
                username: data.username || fullName.toLowerCase().replace(/\s+/g, ""),
                fullName,
                avatarUrl: data.avatar_url,
                avatarInitials: initials || "U",
                category: data.category || "Professional"
              }]);
            }
          });
        }
      }
    } else if (initialConvs.length > 0 && !activeId) {
      setActiveId(initialConvs[0].id);
    }
    setConnectedUsers(updatedContacts);
  }, [activeId, storagePrefix]);

  const loadChatData = useCallback(async () => {
    try {
      const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
      const isValidUser = user && isUuid(currentUserId);
      if (!isValidUser || isGuestSession) {
        // Not logged in or guest session: strictly use Local / LocalStorage
        loadLocalData();
        setLoading(false);
        return;
      }

      // 1. Fetch connected users (accepted connections)
      const { data: rawConnectionsData, error: connErr } = await supabase
        .from("connections")
        .select(`
          id,
          user_id,
          connected_user_id,
          status,
          profiles!connections_connected_user_id_fkey (id, full_name, username, avatar_url, category),
          sender_profile:profiles!connections_user_id_fkey (id, full_name, username, avatar_url, category)
        `)
        .eq("status", "accepted")
        .or(`user_id.eq.${currentUserId},connected_user_id.eq.${currentUserId}`);

      const connectionsData = rawConnectionsData as unknown as DBConnection[];
      const connectedList: ConnectedUser[] = [];
      const connectedSet = new Set<string>();

      if (!connErr && connectionsData) {
        connectionsData.forEach((conn) => {
          const otherProfile = conn.user_id === currentUserId ? conn.profiles : conn.sender_profile;
          if (otherProfile && otherProfile.id !== currentUserId && !connectedSet.has(otherProfile.id)) {
            connectedSet.add(otherProfile.id);
            const fullName = otherProfile.full_name || otherProfile.username || "Anonymous User";
            const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            connectedList.push({
              id: otherProfile.id,
              username: otherProfile.username || fullName.toLowerCase().replace(/\s+/g, ""),
              fullName,
              avatarUrl: otherProfile.avatar_url,
              avatarInitials: initials || "U",
              category: otherProfile.category || "Professional"
            });
          }
        });
      }

      // 2. Fetch profiles
      const { data: rawProfilesData } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, category, public_key");

      const profilesData = rawProfilesData as unknown as DBProfile[];
      const profilesMap = new Map<string, DBProfile>();
      if (profilesData) {
        profilesData.forEach(p => profilesMap.set(p.id, p));
      }

      // Handle redirected active chat recipient ID
      let nextActiveId = activeId;
      const redirectedId = localStorage.getItem("active_chat_recipient_id");
      if (redirectedId) {
        setActiveId(redirectedId);
        nextActiveId = redirectedId;
        setIsMobileChatOpen(true);
        localStorage.removeItem("active_chat_recipient_id");

        // Force add them to connectedSet and connectedList so they appear in unified list
        if (!connectedSet.has(redirectedId)) {
          connectedSet.add(redirectedId);
          const otherProfile = profilesMap.get(redirectedId);
          if (otherProfile) {
            const fullName = otherProfile.full_name || otherProfile.username || "Anonymous User";
            const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            connectedList.push({
              id: otherProfile.id,
              username: otherProfile.username || fullName.toLowerCase().replace(/\s+/g, ""),
              fullName,
              avatarUrl: otherProfile.avatar_url,
              avatarInitials: initials || "U",
              category: otherProfile.category || "Professional"
            });
          } else if (isUuid(redirectedId)) {
            // Already fetched in loadLocalData fallback or not found, wait for unified list update
          }
        }
      }

      // Set connected users
      setConnectedUsers(connectedList);

      // 3. Fetch real messages involving current user
      const { data: rawMessagesData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: true });

      const messagesData = rawMessagesData as unknown as DBMessage[];

      const dbConversations: Conversation[] = [];
      const readConvs = JSON.parse(localStorage.getItem(`read_conversations${storagePrefix}`) || "{}");

      if (!msgErr && messagesData && messagesData.length > 0) {
        // Group messages by recipient
        const grouped = new Map<string, ChatMessage[]>();
        messagesData.forEach((m) => {
          const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
          if (!grouped.has(otherId)) {
            grouped.set(otherId, []);
          }
          grouped.get(otherId)!.push({
            id: m.id,
            sender: m.sender_id === currentUserId ? "me" : "them",
            type: (m.type as MessageType) || "text",
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            read: m.is_read
          });
        });

        // Construct final conversations list
        const entries = Array.from(grouped.entries());
        for (const [otherId, msgs] of entries) {
          const otherProfile = profilesMap.get(otherId);
          const name = otherProfile ? (otherProfile.full_name || otherProfile.username || "Film Professional") : "User";
          const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
          
          let sharedKey: CryptoKey | null = null;
          if (privateKey && otherProfile?.public_key) {
            try {
              const otherPubKey = await importPublicKey(JSON.parse(otherProfile.public_key));
              sharedKey = await deriveAESKey(privateKey, otherPubKey);
            } catch (e) {
              console.debug("E2EE key derivation skipped:", e);
            }
          }

          const decryptedMsgs = await Promise.all(msgs.map(async m => {
             if (m.content.startsWith("ENCRYPTED:")) {
                if (sharedKey) {
                   try {
                      const parts = m.content.split(":");
                      const iv = parts.length === 4 ? parts[2] : parts[1];
                      const cipher = parts.length === 4 ? parts[3] : parts[2];
                      m.content = await decryptMessage(sharedKey, iv, cipher);
                   } catch(e) {
                      m.content = "🔒 [Encrypted Message - Unable to decrypt]";
                   }
                } else {
                   m.content = "🔒 [Encrypted Message - Key missing]";
                }
             }
             return m;
          }));

          const isCurrentlyActive = otherId === activeId;
          const lastReadTime = readConvs[otherId] || 0;

          dbConversations.push({
            id: otherId,
            username: name,
            avatar: initials || "U",
            avatarUrl: otherProfile?.avatar_url,
            messages: decryptedMsgs.map(m => (isCurrentlyActive || new Date(m.timestamp).getTime() <= lastReadTime) && m.sender === "them" ? { ...m, read: true } : m),
            unread: isCurrentlyActive ? 0 : decryptedMsgs.filter(m => m.sender === "them" && !m.read && new Date(m.timestamp).getTime() > lastReadTime).length,
            isOnline: false
          });
        }
      }

      // Sort conversations by last message timestamp descending
      dbConversations.sort((a, b) => {
        const lastA = a.messages[a.messages.length - 1]?.timestamp || 0;
        const lastB = b.messages[b.messages.length - 1]?.timestamp || 0;
        return lastB - lastA;
      });

      // Merge account-scoped outbox of unsent/failed messages so polling never drops retry actions
      try {
        const cachedRaw = localStorage.getItem(`chat_conversations${storagePrefix}`);
        if (cachedRaw) {
          const cachedConvs: Conversation[] = JSON.parse(cachedRaw);
          for (const cConv of cachedConvs) {
            const failedMessages = (cConv.messages || []).filter(m => m.failed);
            if (failedMessages.length > 0) {
              const matchedDbConv = dbConversations.find(c => c.id === cConv.id);
              if (matchedDbConv) {
                for (const fMsg of failedMessages) {
                  if (!matchedDbConv.messages.some(m => m.id === fMsg.id)) {
                    matchedDbConv.messages.push(fMsg);
                  }
                }
                matchedDbConv.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              } else {
                dbConversations.push(cConv);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not merge outbox failed messages:", err);
      }

      setConversations(dbConversations);

      if (!nextActiveId && dbConversations.length > 0) {
        setActiveId(dbConversations[0].id);
      }
    } catch (e) {
      console.error("Error loading chat database data, falling back:", e);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  }, [user, profile?.id, currentUserId, activeId, loadLocalData, privateKey, storagePrefix]);

  const saveLocalData = (newConvs: Conversation[]) => {
    localStorage.setItem(`chat_conversations${storagePrefix}`, JSON.stringify(newConvs));
  };

  // Run initial mount load
  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // Periodic Polling to keep chat fully live (every 4 seconds)
  useEffect(() => {
    const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
    if (!user || isGuestSession) return;
    const interval = setInterval(() => {
      loadChatData();
    }, 4000);
    return () => clearInterval(interval);
  }, [user, loadChatData, profile?.id]);

  // Unified list of all conversations combining active chats and connected users
  const unifiedConversations = useMemo(() => {
    const list: Conversation[] = [];
    const addedIds = new Set<string>();

    // First add all accepted connections (as Conversations)
    connectedUsers.forEach((contact) => {
      const existing = conversations.find((c) => c.id === contact.id);
      if (existing) {
        list.push(existing);
      } else {
        list.push({
          id: contact.id,
          username: contact.fullName,
          avatar: contact.avatarInitials,
          avatarUrl: contact.avatarUrl,
          messages: [],
          unread: 0,
          isOnline: true
        });
      }
      addedIds.add(contact.id);
    });

    // Add any other existing active conversations that aren't in accepted connections list (e.g. seed bots)
    conversations.forEach((c) => {
      if (!addedIds.has(c.id)) {
        list.push(c);
        addedIds.add(c.id);
      }
    });

    // Filter by search query if any
    const q = convSearch.toLowerCase();
    const filtered = list.filter((c) => c.username.toLowerCase().includes(q));

    // Sort by:
    // 1. Conversations with messages first, sorted by last message timestamp descending
    // 2. Then conversations without messages sorted alphabetically
    return filtered.sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1]?.timestamp || 0;
      const lastB = b.messages[b.messages.length - 1]?.timestamp || 0;
      if (lastA > 0 && lastB > 0) return lastB - lastA;
      if (lastA > 0) return -1;
      if (lastB > 0) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [connectedUsers, conversations, convSearch]);

  const activeConv = useMemo(() => unifiedConversations.find((c) => c.id === activeId) || null, [unifiedConversations, activeId]);

  const lastMessageId = activeConv?.messages[activeConv?.messages.length - 1]?.id;

  // Auto-clear unread status when active conversation changes or receives new unread messages
  useEffect(() => {
    if (activeId && activeConv && activeConv.unread > 0) {
      // Clear unread count locally
      const readConvs = JSON.parse(localStorage.getItem(`read_conversations${storagePrefix}`) || "{}");
      readConvs[activeId] = Date.now();
      localStorage.setItem(`read_conversations${storagePrefix}`, JSON.stringify(readConvs));

      setConversations((prev) => prev.map((c) =>
        c.id === activeId ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
      ));

      // Clear in Supabase
      const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
      if (user && !isGuestSession && isUuid(activeId) && isUuid(currentUserId)) {
        supabase
          .from("messages")
          .update({ is_read: true })
          .eq("sender_id", activeId)
          .eq("receiver_id", currentUserId)
          .then(({ error }) => {
            if (error) console.warn("Failed to clear read status in DB:", error);
          });
      }
    }
  }, [activeId, activeConv?.unread, currentUserId, profile?.id, user]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (!activeId) return;
    const scrollToBottom = () => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 50);
    const t2 = setTimeout(scrollToBottom, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeId, lastMessageId, isTyping, loading]);

  function getLastPreview(c: Conversation): string {
    const m = c.messages[c.messages.length - 1];
    if (!m) return "No messages yet";
    if (m.type === "text") return m.content.length > 30 ? m.content.slice(0, 30) + "..." : m.content;
    if (m.type === "image") return "📷 Image file";
    if (m.type === "video") return "🎥 Video file";
    if (m.type === "document") return "📄 Document";
    return "🎵 Audio file";
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatMessageDate(ts: number) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  // Select/activate a conversation
  const selectConversation = async (id: string) => {
    setActiveId(id);
    setIsMobileChatOpen(true);

    // Clear unread count locally (scoped by account)
    const readConvs = JSON.parse(localStorage.getItem(`read_conversations${storagePrefix}`) || "{}");
    readConvs[id] = Date.now();
    localStorage.setItem(`read_conversations${storagePrefix}`, JSON.stringify(readConvs));

    const updated = conversations.map((c) =>
      c.id === id ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
    );
    setConversations(updated);
    saveLocalData(updated);

    // Clear unread in Supabase
    const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
    if (user && !isGuestSession && isUuid(id) && isUuid(currentUserId)) {
      try {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("sender_id", id)
          .eq("receiver_id", currentUserId);
      } catch (err) {
        console.warn("Failed to clear read status in DB:", err);
      }
    }
  };

  // Start new conversation from contact list
  const startConversationWithContact = (contact: ConnectedUser) => {
    const existing = conversations.find(c => c.id === contact.id);
    if (existing) {
      selectConversation(contact.id);
      return;
    }

    // Create new blank conversation
    const newConv: Conversation = {
      id: contact.id,
      username: contact.fullName,
      avatar: contact.avatarInitials,
      avatarUrl: contact.avatarUrl,
      messages: [],
      unread: 0,
      isOnline: true
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveLocalData(updated);
    setActiveId(contact.id);
    setIsMobileChatOpen(true);
  };

  // Send a message
  const sendMessage = async (type: MessageType = "text", contentOverride?: string, fileName?: string) => {
    if (!activeId) return;
    const content = contentOverride ?? input.trim();
    if (!content) return;

    const timestamp = Date.now();
    const clientUuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `msg_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const newMsg: ChatMessage = {
      id: clientUuid,
      sender: "me",
      type,
      content,
      timestamp,
      read: true,
      fileName
    };

    // 1. Update local state instantly for lightning-fast feedback
    const exists = conversations.some((c) => c.id === activeId);
    let updated: Conversation[];

    if (exists) {
      updated = conversations.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      });
    } else {
      const contact = connectedUsers.find((u) => u.id === activeId);
      const newConv: Conversation = {
        id: activeId,
        username: activeConv?.username || contact?.fullName || "User",
        avatar: activeConv?.avatar || contact?.avatarInitials || "U",
        avatarUrl: activeConv?.avatarUrl || contact?.avatarUrl,
        messages: [newMsg],
        unread: 0,
        isOnline: true
      };
      updated = [newConv, ...conversations];
    }

    // Move active conversation to top of list
    const sorted = [...updated].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      const lastA = a.messages[a.messages.length - 1]?.timestamp || 0;
      const lastB = b.messages[b.messages.length - 1]?.timestamp || 0;
      return lastB - lastA;
    });

    setConversations(sorted);
    saveLocalData(sorted);
    setInput("");
    setAttachMenuOpen(false);

    // 2. Persist in Supabase if logged in & not chatting with mock profiles
    const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
    
    const isValidSender = isUuid(currentUserId);
    const isValidReceiver = isUuid(activeId);

    if (user && !isGuestSession && isValidSender && isValidReceiver) {
      try {
        const { data: rxData } = await supabase.from("profiles").select("public_key").eq("id", activeId).single();

        // Mandatory fail-closed encryption: throws if sender privateKey is null, recipient key missing, or encryption fails
        const { envelope } = await encryptForRecipientOrThrow({
          senderPrivateKey: privateKey,
          recipientPublicKeyJwkOrStr: rxData?.public_key,
          plaintext: content
        });

        const { error } = await supabase.from("messages").insert({
          sender_id: currentUserId,
          receiver_id: activeId,
          content: envelope,
          type,
          is_read: false,
          client_message_id: newMsg.id
        });

        if (error) {
          if (error.code === '23505') {
            // Reconcile with existing server record to verify this exact message delivery
            const { data: existingMsg } = await supabase
              .from("messages")
              .select("id, sender_id, receiver_id, content")
              .eq("client_message_id", newMsg.id)
              .maybeSingle();

            if (
              !existingMsg ||
              existingMsg.sender_id !== currentUserId ||
              existingMsg.receiver_id !== activeId ||
              existingMsg.content !== envelope
            ) {
              throw new Error("Message client identifier conflict. Delivery could not be verified.");
            }
          } else {
            throw error;
          }
        }
        loadChatData();
      } catch (err: any) {
        console.warn("Message delivery halted / failed:", err);
        toast({
          variant: "destructive",
          title: "Message Delivery Failed",
          description: err.message || "Message could not be encrypted or saved to the server."
        });
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === newMsg.id ? { ...m, failed: true } : m
                  )
                }
              : c
          );
          saveLocalData(updated);
          return updated;
        });
        return;
      }
    }
  };

  const handleRetryMessage = async (msgToRetry: ChatMessage) => {
    if (!activeId || !user) return;
    const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
    if (isGuestSession) return;

    // Optimistically reset failed state to pending
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgToRetry.id ? { ...m, failed: false } : m
              )
            }
          : c
      );
      saveLocalData(updated);
      return updated;
    });

    try {
      const { data: rxData } = await supabase.from("profiles").select("public_key").eq("id", activeId).single();

      // Mandatory fail-closed encryption: throws if sender privateKey is null, recipient key missing, or encryption fails
      const { envelope } = await encryptForRecipientOrThrow({
        senderPrivateKey: privateKey,
        recipientPublicKeyJwkOrStr: rxData?.public_key,
        plaintext: msgToRetry.content
      });

      const { error } = await supabase.from("messages").insert({
        sender_id: currentUserId,
        receiver_id: activeId,
        content: envelope,
        type: msgToRetry.type,
        is_read: false,
        client_message_id: msgToRetry.id
      });

      if (error) {
        if (error.code === '23505') {
          const { data: existingMsg } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id, content")
            .eq("client_message_id", msgToRetry.id)
            .maybeSingle();

          if (
            !existingMsg ||
            existingMsg.sender_id !== currentUserId ||
            existingMsg.receiver_id !== activeId ||
            existingMsg.content !== envelope
          ) {
            throw new Error("Message client identifier conflict on retry. Delivery could not be verified.");
          }
        } else {
          throw error;
        }
      }

      toast({
        title: "Message sent",
        description: "Your message has been delivered."
      });
      loadChatData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Retry failed",
        description: err?.message || "Could not deliver encrypted message."
      });
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgToRetry.id ? { ...m, failed: true } : m
                )
              }
            : c
        );
        saveLocalData(updated);
        return updated;
      });
    }
  };

  // Handle local attachment real file upload & convert to base64
  const triggerAttachmentSelection = (type: MessageType) => {
    setPendingFileType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        await sendMessage(pendingFileType, base64Data, file.name);
        toast({
          title: "Attachment processed",
          description: `Sending ${file.name}...`
        });
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "File error",
          description: err?.message || "Failed to send attachment."
        });
      }
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "File error",
        description: "Failed to read attachment file."
      });
    };
    reader.readAsDataURL(file);

    // reset input
    if (e.target) {
      e.target.value = "";
    }
  };

  // Load older messages pagination from Supabase
  const loadOlder = async () => {
    if (!activeConv || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const isGuestSession = !profile?.id || profile.id === "guest-profile-id" || profile.id === "admin-guest-profile" || !!localStorage.getItem("guest_session");
      if (user && !isGuestSession && isUuid(activeConv.id) && isUuid(currentUserId)) {
        const oldestMsg = activeConv.messages[0];
        const oldestTimestamp = oldestMsg ? new Date(oldestMsg.timestamp).toISOString() : new Date().toISOString();

        const { data: olderDbMessages, error: olderErr } = await supabase
          .from("messages")
          .select("*")
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeConv.id}),and(sender_id.eq.${activeConv.id},receiver_id.eq.${currentUserId})`)
          .lt("created_at", oldestTimestamp)
          .order("created_at", { ascending: false })
          .limit(20);

        if (olderErr) {
          throw olderErr;
        }

        if (!olderDbMessages || olderDbMessages.length === 0) {
          toast({
            title: "End of conversation history",
            description: "No earlier messages exist in this conversation."
          });
          setLoadingOlder(false);
          return;
        }

        // Derive sharedKey for activeConv if privateKey exists
        let sharedKey: CryptoKey | null = null;
        if (privateKey) {
          try {
            const { data: otherP } = await supabase
              .from("profiles")
              .select("public_key")
              .eq("id", activeConv.id)
              .maybeSingle();

            if (otherP?.public_key) {
              const otherPubKey = await importPublicKey(JSON.parse(otherP.public_key));
              sharedKey = await deriveAESKey(privateKey, otherPubKey);
            }
          } catch (e) {
            console.debug("E2EE derive failed for older msgs:", e);
          }
        }

        const mappedOlder: ChatMessage[] = await Promise.all(
          olderDbMessages.reverse().map(async (m) => {
            let content = m.content;
            if (content && typeof content === "string" && content.startsWith("ENCRYPTED:")) {
              if (sharedKey) {
                try {
                  const [, iv, cipher] = content.split(":");
                  content = await decryptMessage(sharedKey, iv, cipher);
                } catch {
                  content = "🔒 [Encrypted Message - Unable to decrypt]";
                }
              } else {
                content = "🔒 [Encrypted Message - Key missing]";
              }
            }
            return {
              id: m.id,
              sender: m.sender_id === currentUserId ? "me" : "them",
              type: (m.type as MessageType) || "text",
              content,
              timestamp: new Date(m.created_at).getTime(),
              read: m.is_read
            };
          })
        );

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? { ...c, messages: [...mappedOlder, ...c.messages] }
              : c
          )
        );
        chatBodyRef.current?.scrollTo({ top: 120, behavior: "smooth" });
      } else {
        toast({
          title: "End of history",
          description: "No earlier messages available."
        });
      }
    } catch (err: any) {
      console.error("Failed to load older messages:", err);
      toast({
        variant: "destructive",
        title: "Could not load older messages",
        description: err?.message || "Error retrieving earlier messages."
      });
    } finally {
      setLoadingOlder(false);
    }
  };

  // Delete/Clear conversation
  const clearConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    saveLocalData(updated);
    if (activeId === id) {
      setActiveId(updated[0]?.id || null);
    }
    toast({
      title: "Conversation cleared",
      description: "Chat history has been removed locally."
    });
  };

  const submitReport = async () => {
    if (!activeConv || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reported_user_id: activeConv.id,
        reporter_id: currentUserId,
        reason: reportReason.trim()
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Report submitted",
        description: `Your report for ${activeConv.username} has been recorded.`
      });
      setReportReason("");
      setReportModalOpen(false);
    } catch (err: any) {
      console.error("Failed to submit report:", err);
      toast({
        variant: "destructive",
        title: "Report failed",
        description: err?.message || `Could not submit report for ${activeConv.username}. Please try again.`
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 bg-background p-4 lg:p-6 -m-6 overflow-hidden font-sans">
        
        {/* Hidden File Input for base64 Attachment Uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept={
            pendingFileType === "image" ? "image/*" :
            pendingFileType === "video" ? "video/*" :
            pendingFileType === "audio" ? "audio/*" :
            "*/*"
          }
        />

        {/* Left column: Directory Sidebar */}
        <Card id="messages-sidebar" className={`flex flex-col overflow-hidden bg-card text-card-foreground rounded-xl shadow-noir border border-border/80 ${
          isMobileChatOpen ? "hidden lg:flex" : "flex"
        }`}>
          <div className="p-4 border-b border-border/80 bg-surface-elevated/30">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">Messages</h1>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Chat with connected film professionals
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                className="pl-9 h-9 border-border/80 bg-surface-elevated/60 text-foreground rounded-lg focus-visible:ring-primary text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : (
              <>
                {unifiedConversations.map((c) => {
                  const last = getLastPreview(c);
                  const lastMsg = c.messages[c.messages.length - 1];
                  const lastTs = lastMsg?.timestamp;
                  const isActive = c.id === activeId;
                  return (
                    <div
                      key={c.id}
                      className={`group w-full rounded-xl p-3 flex items-start gap-3 transition-all relative ${
                        isActive 
                          ? "bg-primary/10 border-l-4 border-primary" 
                          : "hover:bg-surface-hover border-l-4 border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => selectConversation(c.id)}
                        className="flex-1 text-left flex items-start gap-3 min-w-0"
                      >
                        <div className="relative flex-shrink-0">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.username} className="w-11 h-11 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-sm font-semibold shadow-sm">
                              {c.avatar}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-foreground text-sm truncate">{c.username}</span>
                            <span className="font-mono text-[10px] text-muted-foreground font-medium">
                              {lastTs ? formatTime(lastTs) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate flex-1 ${c.unread > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                              {last}
                            </p>
                            {c.unread > 0 && (
                              <span className="bg-primary text-primary-foreground font-mono text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center flex-shrink-0">
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}

                {unifiedConversations.length === 0 && (
                  <div className="py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No conversations found</p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Right column: Chat Window */}
        <Card id="messages-chat-window" className={`flex flex-col overflow-hidden bg-card text-card-foreground rounded-xl shadow-noir border border-border/80 ${
          isMobileChatOpen ? "flex" : "hidden lg:flex"
        }`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border/80 p-4 flex items-center justify-between bg-surface-elevated/30 z-10 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg lg:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate(`/profile/${activeConv.id}`)}
                    title="View Profile"
                  >
                    <div className="relative">
                      {activeConv.avatarUrl ? (
                        <img src={activeConv.avatarUrl} alt={activeConv.username} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary transition-all" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-sm font-semibold shadow-sm group-hover:ring-2 group-hover:ring-primary transition-all">
                          {activeConv.avatar}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground leading-tight text-sm md:text-base group-hover:text-primary transition-colors">{activeConv.username}</h2>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {dropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 mt-8 w-40 bg-card border border-border rounded-lg shadow-lg z-40 p-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setReportModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors flex items-center gap-1.5"
                        >
                          ⚠️ Report User
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Chat Body messages stream */}
              <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/60">
                <div className="text-center pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="border-border/80 text-foreground hover:bg-surface-hover hover:border-primary/40 text-xs h-7 rounded-lg transition-colors"
                  >
                    {loadingOlder ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    ) : null}
                    Load older messages
                  </Button>
                </div>

                {/* Render messages with grouped date headers */}
                {(() => {
                  let lastDateStr = "";
                  return activeConv.messages.map((m) => {
                    const dateStr = formatMessageDate(m.timestamp);
                    const showDateHeader = dateStr !== lastDateStr;
                    lastDateStr = dateStr;

                    const isMe = m.sender === "me";

                    return (
                      <React.Fragment key={m.id}>
                        {showDateHeader && (
                          <div className="flex justify-center my-4">
                            <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-surface-elevated border border-border/80 rounded-full px-3 py-1 shadow-2xs">
                              {dateStr}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                          <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-2xs border ${
                                isMe
                                  ? "bg-primary text-primary-foreground border-transparent rounded-tr-none"
                                  : "bg-surface-elevated text-foreground border-border/70 rounded-tl-none"
                              }`}
                            >
                              {m.type === "text" && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                              
                              {m.type === "image" && (
                                <div className="space-y-1.5">
                                  <img
                                    src={m.content}
                                    alt="Uploaded file"
                                    className="rounded-lg max-w-full max-h-60 object-cover border border-border"
                                    referrerPolicy="no-referrer"
                                  />
                                  {m.fileName && (
                                    <p className="text-[11px] underline opacity-90 truncate">{m.fileName}</p>
                                  )}
                                </div>
                              )}

                              {m.type === "video" && (
                                <div className="space-y-1.5">
                                  <video src={m.content} controls className="rounded-lg max-w-full max-h-60" />
                                  {m.fileName && (
                                    <p className="text-[11px] opacity-90 truncate">{m.fileName}</p>
                                  )}
                                </div>
                              )}

                              {m.type === "document" && (
                                <div className="flex items-center gap-3 py-1">
                                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="font-semibold text-xs truncate max-w-[180px]">
                                      {m.fileName || "Document.pdf"}
                                    </p>
                                    <a
                                      href={m.content}
                                      download
                                      className="text-[10px] underline hover:opacity-85"
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Download document
                                    </a>
                                  </div>
                                </div>
                              )}

                              {m.type === "audio" && (
                                <div className="space-y-1.5 py-1">
                                  <audio src={m.content} controls className="w-full max-w-[240px]" />
                                  {m.fileName && (
                                    <p className="text-[10px] opacity-90 truncate">{m.fileName}</p>
                                  )}
                                </div>
                              )}

                              <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                                isMe ? "text-primary-foreground/80 font-mono" : "text-muted-foreground font-mono"
                              }`}>
                                <span>{formatTime(m.timestamp)}</span>
                                {isMe && (
                                  m.failed ? (
                                    <span className="text-destructive font-sans font-medium text-[10px] flex items-center gap-1.5">
                                      <span>Delivery failed</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRetryMessage(m);
                                        }}
                                        className="underline hover:text-destructive/80 font-semibold cursor-pointer"
                                      >
                                        Retry
                                      </button>
                                    </span>
                                  ) : m.id.startsWith('msg_temp_') ? (
                                    <Check className="w-3.5 h-3.5 text-primary-foreground/70" />
                                  ) : m.read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-primary-foreground" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
                })()}

                {/* Simulated live typing notification */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-2 text-xs text-muted-foreground flex items-center gap-1.5 shadow-2xs">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      </div>
                      <span>{activeConv.username} is typing...</span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Message Composer Area */}
              <div className="border-t border-border p-4 bg-card relative">
                
                {/* Expandable Media / Attachment Floating Menu */}
                {attachMenuOpen && (
                  <div className="absolute bottom-full left-4 mb-2 bg-card border border-border rounded-xl shadow-lg p-3 grid grid-cols-2 gap-2 z-20 w-64 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase mb-1">Send Local File</div>
                    
                    <button
                      onClick={() => triggerAttachmentSelection("image")}
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover hover:text-primary rounded-lg text-xs font-medium text-foreground transition-all text-left"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                      Image File
                    </button>

                    <button
                      onClick={() => triggerAttachmentSelection("video")}
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover hover:text-primary rounded-lg text-xs font-medium text-foreground transition-all text-left"
                    >
                      <VideoIcon className="w-4 h-4 text-red-500" />
                      Video File
                    </button>

                    <button
                      onClick={() => triggerAttachmentSelection("document")}
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover hover:text-primary rounded-lg text-xs font-medium text-foreground transition-all text-left"
                    >
                      <FileText className="w-4 h-4 text-green-500" />
                      Document
                    </button>

                    <button
                      onClick={() => triggerAttachmentSelection("audio")}
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover hover:text-primary rounded-lg text-xs font-medium text-foreground transition-all text-left"
                    >
                      <Music className="w-4 h-4 text-purple-500" />
                      Audio File
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAttachMenuOpen((s) => !s)}
                    className={`h-10 w-10 rounded-xl flex-shrink-0 transition-all ${
                      attachMenuOpen
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-border/80 text-muted-foreground hover:border-primary/40 hover:bg-surface-hover hover:text-primary"
                    }`}
                  >
                    {attachMenuOpen ? <X className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                  </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && input.trim()) {
                        sendMessage();
                      }
                    }}
                    placeholder={`Message ${activeConv.username}...`}
                    className="flex-1 h-10 border-border/80 bg-surface-elevated/60 text-foreground rounded-xl focus-visible:ring-primary text-sm px-4"
                  />

                  <Button
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-semibold">Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background/60">
              <div className="max-w-md p-6 bg-card border border-border/80 rounded-2xl shadow-noir">
                <div className="w-12 h-12 bg-primary/15 text-primary border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Start a Conversation</h3>
                <p className="text-xs text-muted-foreground">
                  Select a professional from the list on the left to start a professional dialogue.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Report User Modal Popup */}
      {reportModalOpen && activeConv && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-lg">⚠️</span>
                <h3 className="font-bold text-foreground text-base">Report User</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
                onClick={() => setReportModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are reporting <span className="font-semibold text-foreground">{activeConv.username}</span>. Please describe the violation in detail below. Our moderation team will investigate.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Detailed Reason</label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Provide specific details about harassment, spam, or inappropriate behavior..."
                  className="w-full min-h-[100px] p-3 text-sm border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-surface-elevated/50 text-foreground"
                />
              </div>
            </div>

            <div className="p-6 bg-card border-t border-border flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setReportModalOpen(false)}
                className="rounded-xl border-border text-foreground hover:bg-muted text-xs h-9 px-4 font-semibold"
                disabled={submittingReport}
              >
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={submittingReport || !reportReason.trim()}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 font-semibold shadow-sm flex items-center gap-1.5"
              >
                {submittingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
