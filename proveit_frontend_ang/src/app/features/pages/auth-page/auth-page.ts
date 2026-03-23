import { Component } from '@angular/core';
import { Login } from '../../components/login/login';
import { Signup } from '../../components/signup/signup';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [Login, Signup, NgIf],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.css',
})
export class AuthPage {
  constructor(public auth: AuthService) {
    console.log('From Landing : ', auth);
  }
}
