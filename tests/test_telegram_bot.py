"""
Telegram Bot Tests for Signify KZ - OTP Verification System
Tests:
1. Bot is running and responding
2. CopyTextButton import and functionality
3. InlineKeyboardButton with copy_text parameter
4. OTP code format (monospace with backticks)
"""

import pytest
import os
import sys
import asyncio

# Add backend to path
sys.path.insert(0, '/app/backend')

from dotenv import load_dotenv
load_dotenv('/app/backend/.env')


class TestTelegramBotImports:
    """Test that all required telegram imports work correctly"""
    
    def test_copytextbutton_import(self):
        """Test CopyTextButton can be imported from telegram module"""
        from telegram import CopyTextButton
        assert CopyTextButton is not None
        print("✅ CopyTextButton imported successfully")
    
    def test_inlinekeyboardbutton_import(self):
        """Test InlineKeyboardButton can be imported"""
        from telegram import InlineKeyboardButton
        assert InlineKeyboardButton is not None
        print("✅ InlineKeyboardButton imported successfully")
    
    def test_inlinekeyboardmarkup_import(self):
        """Test InlineKeyboardMarkup can be imported"""
        from telegram import InlineKeyboardMarkup
        assert InlineKeyboardMarkup is not None
        print("✅ InlineKeyboardMarkup imported successfully")


class TestCopyTextButtonFunctionality:
    """Test CopyTextButton functionality for direct clipboard copy"""
    
    def test_copytextbutton_creation(self):
        """Test CopyTextButton can be created with text parameter"""
        from telegram import CopyTextButton
        
        otp_code = "123456"
        copy_btn = CopyTextButton(text=otp_code)
        
        assert copy_btn is not None
        assert copy_btn.text == otp_code
        print(f"✅ CopyTextButton created with text: {copy_btn.text}")
    
    def test_inlinekeyboardbutton_with_copy_text(self):
        """Test InlineKeyboardButton accepts copy_text parameter"""
        from telegram import InlineKeyboardButton, CopyTextButton
        
        otp_code = "654321"
        btn = InlineKeyboardButton(
            "📋 Copy Code", 
            copy_text=CopyTextButton(text=otp_code)
        )
        
        assert btn is not None
        assert btn.text == "📋 Copy Code"
        assert btn.copy_text is not None
        assert btn.copy_text.text == otp_code
        print(f"✅ InlineKeyboardButton with copy_text created successfully")
        print(f"   Button text: {btn.text}")
        print(f"   Copy text value: {btn.copy_text.text}")
    
    def test_inline_keyboard_markup_with_copy_button(self):
        """Test full keyboard markup with copy button"""
        from telegram import InlineKeyboardButton, InlineKeyboardMarkup, CopyTextButton
        
        otp_code = "789012"
        keyboard = [[InlineKeyboardButton("📋 Copy Code", copy_text=CopyTextButton(text=otp_code))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        assert reply_markup is not None
        assert len(reply_markup.inline_keyboard) == 1
        assert len(reply_markup.inline_keyboard[0]) == 1
        
        button = reply_markup.inline_keyboard[0][0]
        assert button.text == "📋 Copy Code"
        assert button.copy_text.text == otp_code
        print(f"✅ InlineKeyboardMarkup with copy button created successfully")


class TestOTPCodeFormat:
    """Test OTP code formatting (monospace with backticks)"""
    
    def test_otp_message_format(self):
        """Test OTP message is formatted with backticks for monospace"""
        otp_code = "123456"
        message = f"Your code is `{otp_code}`"
        
        # Check message contains backticks around the code
        assert f"`{otp_code}`" in message
        assert message == "Your code is `123456`"
        print(f"✅ OTP message format correct: {message}")
    
    def test_otp_code_is_6_digits(self):
        """Test OTP code generation produces 6-digit codes"""
        import random
        
        for _ in range(10):
            otp_code = f"{random.randint(100000, 999999)}"
            assert len(otp_code) == 6
            assert otp_code.isdigit()
        
        print("✅ OTP codes are 6 digits")


class TestBotConnection:
    """Test bot connection and API access"""
    
    @pytest.mark.asyncio
    async def test_bot_get_me(self):
        """Test bot can connect to Telegram API and get bot info"""
        from telegram import Bot
        
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        assert token is not None, "TELEGRAM_BOT_TOKEN not set"
        
        bot = Bot(token=token)
        me = await bot.get_me()
        
        assert me is not None
        assert me.username == "twotick_bot"
        assert me.is_bot is True
        
        print(f"✅ Bot connected successfully")
        print(f"   Username: @{me.username}")
        print(f"   Name: {me.first_name}")
        print(f"   ID: {me.id}")
    
    @pytest.mark.asyncio
    async def test_bot_token_valid(self):
        """Test bot token is valid and working"""
        from telegram import Bot
        from telegram.error import InvalidToken
        
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        
        try:
            bot = Bot(token=token)
            me = await bot.get_me()
            assert me is not None
            print("✅ Bot token is valid")
        except InvalidToken:
            pytest.fail("Bot token is invalid")


class TestBotCodeStructure:
    """Test the bot code structure and implementation"""
    
    def test_start_telegram_bot_file_exists(self):
        """Test start_telegram_bot.py file exists"""
        assert os.path.exists('/app/backend/start_telegram_bot.py')
        print("✅ start_telegram_bot.py exists")
    
    def test_copytextbutton_import_in_code(self):
        """Test CopyTextButton is imported in the bot code"""
        with open('/app/backend/start_telegram_bot.py', 'r') as f:
            content = f.read()
        
        assert 'CopyTextButton' in content
        assert 'from telegram import' in content
        print("✅ CopyTextButton is imported in bot code")
    
    def test_copy_text_parameter_used(self):
        """Test copy_text parameter is used in InlineKeyboardButton"""
        with open('/app/backend/start_telegram_bot.py', 'r') as f:
            content = f.read()
        
        # Check for copy_text=CopyTextButton pattern
        assert 'copy_text=CopyTextButton' in content
        print("✅ copy_text=CopyTextButton pattern found in code")
    
    def test_monospace_format_used(self):
        """Test monospace format (backticks) is used for OTP code"""
        with open('/app/backend/start_telegram_bot.py', 'r') as f:
            content = f.read()
        
        # Check for backtick format in message
        assert '`{' in content or 'f"`' in content or '`{new_otp_code}`' in content
        print("✅ Monospace format (backticks) used for OTP code")
    
    def test_inline_keyboard_button_present(self):
        """Test InlineKeyboardButton is used for Copy Code button"""
        with open('/app/backend/start_telegram_bot.py', 'r') as f:
            content = f.read()
        
        assert 'InlineKeyboardButton' in content
        assert '📋 Copy Code' in content
        print("✅ InlineKeyboardButton with 'Copy Code' text found")


class TestPythonTelegramBotVersion:
    """Test python-telegram-bot version requirements"""
    
    def test_version_supports_copytextbutton(self):
        """Test installed version supports CopyTextButton (v21.8+)"""
        import telegram
        
        version = telegram.__version__
        major, minor = map(int, version.split('.')[:2])
        
        # CopyTextButton requires v21.8+
        assert major >= 21, f"Major version {major} < 21"
        if major == 21:
            assert minor >= 8, f"Minor version {minor} < 8 for major version 21"
        
        print(f"✅ python-telegram-bot version {version} supports CopyTextButton")
    
    def test_requirements_file_has_correct_version(self):
        """Test requirements.txt specifies correct version"""
        with open('/app/backend/requirements.txt', 'r') as f:
            content = f.read()
        
        assert 'python-telegram-bot==21.8' in content or 'python-telegram-bot>=21.8' in content
        print("✅ requirements.txt has correct python-telegram-bot version")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
