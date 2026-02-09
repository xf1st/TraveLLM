import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius } from '../../constants/theme';
import { sendGuideChatMessage } from '../../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'system-1',
  role: 'assistant',
  content: `Привет! Я ваш AI-гид по путешествиям.

Спросите меня о чём угодно:
• Куда поехать в определённый сезон?
• Нужна ли виза в конкретную страну?
• Какие достопримечательности стоит посетить?
• Советы по безопасности
• Местная кухня и рестораны
• Бюджет поездки

Задайте ваш вопрос ниже!`,
  timestamp: new Date(),
};

const QUICK_QUESTIONS = [
  'Куда поехать зимой?',
  'Нужна ли виза в Турцию?',
  'Безопасные страны для путешествий',
  'Лучшие пляжи мира',
  'Бюджетные направления 2026',
];

export default function GuideScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendGuideChatMessage(text.trim());

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.response || response.content || 'Извините, произошла ошибка. Попробуйте ещё раз.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Не удалось получить ответ. Проверьте подключение к интернету и попробуйте снова.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [sending]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
      ]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: 'rgba(124,185,212,0.15)' }]}>
            <Ionicons name="sparkles" size={16} color="#7CB9D4" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }],
          ]}
        >
          <Text style={[
            styles.messageText,
            { color: isUser ? '#fff' : colors.text },
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isUser ? 'rgba(255,255,255,0.5)' : colors.textMuted },
          ]}>
            {item.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const showQuickQuestions = messages.length <= 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: 'rgba(124,185,212,0.12)' }]}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#7CB9D4" />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Гид</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {sending ? 'Печатает...' : 'Онлайн'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListFooterComponent={
          <>
            {/* Typing indicator */}
            {sending && (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(124,185,212,0.15)' }]}>
                  <Ionicons name="sparkles" size={16} color="#7CB9D4" />
                </View>
                <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <ActivityIndicator size="small" color="#7CB9D4" />
                  <Text style={[styles.typingText, { color: colors.textSecondary }]}>Думаю...</Text>
                </View>
              </View>
            )}

            {/* Quick questions */}
            {showQuickQuestions && (
              <View style={styles.quickQuestions}>
                <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>Быстрые вопросы</Text>
                {QUICK_QUESTIONS.map((q, i) => (
                  <Pressable
                    key={i}
                    style={[styles.quickChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    onPress={() => sendMessage(q)}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#7CB9D4" />
                    <Text style={[styles.quickText, { color: colors.text }]}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Задайте вопрос..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              onSubmitEditing={() => sendMessage(inputText)}
              blurOnSubmit={false}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() && !sending ? '#fff' : 'rgba(255,255,255,0.3)'}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#7CB9D4',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  // Typing
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
  },
  // Quick questions
  quickQuestions: {
    marginTop: 8,
    gap: 8,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickText: {
    fontSize: 14,
  },
  // Input
  inputBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7CB9D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(124,185,212,0.3)',
  },
});
