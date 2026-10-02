import { Scissors, Phone, Mail, MapPin, Instagram, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-primary-900 text-primary-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-accent-400 rounded-full flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-900" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Belleza
              </span>
            </div>
            <p className="text-sm text-primary-300 leading-relaxed">
              Where beauty meets luxury. Experience premium salon services in an elegant and welcoming environment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" className="text-sm text-primary-300 hover:text-highlight-400 transition-colors">Home</Link></li>
              <li><Link to="/services" className="text-sm text-primary-300 hover:text-highlight-400 transition-colors">Services</Link></li>
              <li><Link to="/team" className="text-sm text-primary-300 hover:text-highlight-400 transition-colors">Our Team</Link></li>
              <li><Link to="/booking" className="text-sm text-primary-300 hover:text-highlight-400 transition-colors">Book Appointment</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-highlight-400 flex-shrink-0" />
                <span className="text-sm text-primary-300">(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-highlight-400 flex-shrink-0" />
                <span className="text-sm text-primary-300">hello@belleza.com</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-highlight-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-primary-300">123 Beauty Lane,<br />Suite 100, New York, NY</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Hours</h3>
            <ul className="space-y-2">
              <li className="flex justify-between text-sm">
                <span className="text-primary-300">Mon - Fri</span>
                <span className="text-primary-200">9:00 AM - 6:00 PM</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-primary-300">Saturday</span>
                <span className="text-primary-200">10:00 AM - 4:00 PM</span>
              </li>
              <li className="flex justify-between text-sm">
                <span className="text-primary-300">Sunday</span>
                <span className="text-primary-200">Closed</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-5">
              <a href="#" className="w-9 h-9 bg-primary-800 hover:bg-accent-500 rounded-lg flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-primary-800 hover:bg-accent-500 rounded-lg flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-800 text-center">
          <p className="text-sm text-primary-400">
            &copy; {new Date().getFullYear()} Belleza. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
