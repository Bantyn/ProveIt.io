import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [Navbar, Footer, ShaderHeroComponent, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {

}
