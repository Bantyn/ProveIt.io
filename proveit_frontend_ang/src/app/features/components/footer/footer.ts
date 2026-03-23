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
        title: "About", 
        links: [
          { label: "Home", path: "/landing" },
          { label: "Features", path: "/features" },
          { label: "Pricing", path: "/pricing" },
          { label: "Contact Us", path: "/contact" }
        ] 
      },
      { 
        title: "Platform", 
        links: [
          { label: "Documentation", path: "/docs" },
          { label: "Security", path: "/security" },
          { label: "Certification", path: "/certify" },
          { label: "Support", path: "/support" }
        ] 
      },
      { 
        title: "Resources", 
        links: [
          { label: "News", path: "/news" },
          { label: "Blog", path: "/blog" },
          { label: "Community", path: "/community" },
          { label: "Publications", path: "/pubs" }
        ] 
      },
    ],
    social: [
      { href: "#", label: "Twitter", icon: this.twitter },
      { href: "#", label: "GitHub", icon: this.github },
      { href: "#", label: "LinkedIn", icon: this.linkedin },
    ],
    title: "ProveIt",
    subtitle: "Verify skills with confidence",
    copyright: "© 2024 ProveIt.io. All rights reserved",
  };
}
