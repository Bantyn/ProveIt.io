import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Twitter, Github, Linkedin, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly twitter = Twitter;
  readonly github = Github;
  readonly linkedin = Linkedin;
  readonly arrowRight = ArrowRight;

  footerData = {
    sections: [
      {
        title: 'Platform',
        links: [
          { label: 'Home', path: '/' },
          { label: 'Competitions', path: '/user/compition' },
          { label: 'Pricing', path: '/pricing' },
          { label: 'About Us', path: '/about' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'Partners', path: '/user/company' },
          { label: 'Support', path: '/support' },
          { label: 'Contact Us', path: '/contact' },
          { label: 'Platform Status', path: '/maintenance' },
        ],
      },
      {
        title: 'Community',
        links: [
          { label: 'Leaderboard', path: '/leader' },
          { label: 'Sign In', path: '/auth' },
          { label: 'Dashboard', path: '/company/dashboard' },
          { label: 'Help Center', path: '/support' },
        ],
      },
    ],
    social: [
      { href: 'https://x.com/proveit_io', label: 'Twitter', icon: this.twitter },
      { href: 'https://github.com/ProveIt-io', label: 'GitHub', icon: this.github },
      {
        href: 'https://www.linkedin.com/company/proveit-io/',
        label: 'LinkedIn',
        icon: this.linkedin,
      },
    ],
    title: 'ProveIt',
    subtitle: 'Verify skills with confidence',
    copyright: '© 2026 ProveIt.io. All rights reserved',
  };
}
