import {
  Component,
  signal,
  inject,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { NgIf, AsyncPipe, NgForOf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/eniroment';
import { marked } from 'marked';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: SafeHtml;
  time: Date;
}

@Component({
  selector: 'app-ai-widget',
  standalone: true,
  imports: [NgIf, AsyncPipe, NgForOf, DatePipe, FormsModule],
  templateUrl: './ai-widget.html',
  styleUrl: './ai-widget.css',
})
export class AiWidget {
  private router = inject(Router);
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  // Track current user
  user$ = this.authService.user$;

  // Track current route as a string
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  // Determine visibility: Logged in users only, and not on landing page
  isVisible = computed(() => {
    const url = this.currentUrl();
    const isLandingPage = url === '/' || url === '';
    return !isLandingPage;
  });

  isOpen = signal(false);

  // Chat State
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  private sessionId = Math.random().toString(36).substring(7);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private shouldScrollToBottom = true;

  constructor() {
    const defaultMsg = "Hi there! I'm your ProveIt AI assistant. How can I help you today?";
    this.messages.set([
      {
        role: 'assistant',
        content: this.sanitizer.bypassSecurityTrustHtml(defaultMsg),
        time: new Date(),
      },
    ]);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  toggleWidget() {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.shouldScrollToBottom = true;
    }
  }

  closeWidget() {
    this.isOpen.set(false);
  }

  async sendMessage(text?: string) {
    const messageContent = text || this.userInput.trim();
    if (!messageContent) return;

    // Add user message to UI
    this.messages.update((msgs) => [
      ...msgs,
      {
        role: 'user',
        content: this.sanitizer.bypassSecurityTrustHtml(messageContent),
        time: new Date(),
      },
    ]);
    this.userInput = ''; // clear input
    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    try {
      // Fetch company profile if a user is logged in
      let companyId: string | undefined = undefined;
      const user: any = await firstValueFrom(this.authService.user$.pipe(take(1)));

      if (user && user.uid) {
        try {
          const company: any = await firstValueFrom(this.apiService.getCompanyByOwnerId(user.uid));
          if (company) {
            companyId = company.id;
          }
        } catch (e) {}
      }

      const apiUrl = environment.apiUrl;

      const response = await fetch(`${apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: messageContent,
          sessionId: this.sessionId,
          companyId: companyId,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json();
          throw new Error(errData.error || 'Feature not available in your plan.');
        }
        throw new Error('API Response was not ok');
      }

      const rawText = await response.text();
      let data: any = null;
      let replyHtml = '';

      try {
        const rawData = JSON.parse(rawText);

        const extractContent = (item: any): string => {
          if (!item) return '';

          // If it's a string, check if it's actually another JSON string
          if (typeof item === 'string') {
            const trimmed = item.trim();
            if (
              (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))
            ) {
              try {
                const parsed = JSON.parse(item);
                return extractContent(parsed);
              } catch (e) {
                return item; // Not valid JSON after all
              }
            }
            return item;
          }

          // If it's an array, take the first element
          if (Array.isArray(item)) {
            return item.length > 0 ? extractContent(item[0]) : '';
          }

          // If it's an object, look for common response keys
          if (typeof item === 'object') {
            // Check for n8n's webhook input echo (common misconfiguration)
            if (item.headers && item.body && !item.output && !item.reply && !item.text) {
              return "⚠️ **n8n Configuration Issue**: The workflow is returning the request metadata instead of the AI response. Please ensure your n8n workflow ends with a 'Respond to Webhook' node connected to your AI node.";
            }

            const priorityKeys = ['reply', 'output', 'text', 'response', 'message', 'content'];
            for (const key of priorityKeys) {
              if (item[key]) return extractContent(item[key]);
            }

            // Fallback for unknown object structure
            return JSON.stringify(item, null, 2);
          }

          return String(item);
        };

        replyHtml = extractContent(rawData);
      } catch (e) {
        replyHtml = rawText;
      }

      // Convert Markdown to HTML
      const parsedHtml = await marked.parse(replyHtml);
      const safeContent = this.sanitizer.bypassSecurityTrustHtml(parsedHtml);

      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: safeContent, time: new Date() },
      ]);
      this.shouldScrollToBottom = true;
    } catch (error: any) {
      console.error('AI Widget Error:', error);
      this.messages.update((msgs) => [
        ...msgs,
        {
          role: 'assistant',
          content: this.sanitizer.bypassSecurityTrustHtml(
            error.message && error.message.includes('plan')
              ? error.message
              : 'Connection error. Please ensure the AI backend is reachable.',
          ),
          time: new Date(),
        },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
