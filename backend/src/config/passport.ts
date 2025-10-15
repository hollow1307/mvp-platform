import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { config } from './environment';

// Настройка Steam стратегии
passport.use(new SteamStrategy({
  returnURL: `${config.backendUrl}/api/auth-new/steam/return`,
  realm: config.backendUrl,
  apiKey: config.steamApiKey
},
  (identifier: string, profile: any, done: any) => {
    // Извлекаем SteamID из identifier
    const steamId = identifier.split('/').pop();
    
    const user = {
      steamId: steamId,
      username: profile.displayName,
      avatar: {
        small: profile.photos[0]?.value,
        medium: profile.photos[1]?.value,
        large: profile.photos[2]?.value
      },
      profileUrl: profile._json.profileurl
    };

    return done(null, user);
  }
));

// Сериализация пользователя (для сессий)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

// Десериализация пользователя
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;


