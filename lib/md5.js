/*
 * MD5 (Message-Digest Algorithm)
 * Fixed version based on public domain implementation.
 */
function md5(string) {

  function RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function AddUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lResult = (lX & 0x7FFFFFFF) + (lY & 0x7FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }

  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return (x ^ y ^ z); }
  function I(x, y, z) { return (y ^ (x | (~z))); }

  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    a = RotateLeft(a, s);
    return AddUnsigned(a, b);
  }

  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    a = RotateLeft(a, s);
    return AddUnsigned(a, b);
  }

  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    a = RotateLeft(a, s);
    return AddUnsigned(a, b);
  }

  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    a = RotateLeft(a, s);
    return AddUnsigned(a, b);
  }

  function convertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = new Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;

    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }

    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue) {
    var WordToHexValue = "";
    var lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue += (lByte < 16 ? "0" : "") + lByte.toString(16);
    }
    return WordToHexValue;
  }

  function uTF8Encode(string) {
    string = string.replace(/\x0d\x0a/g, "\x0a");
    var out = "";
    for (var i = 0; i < string.length; i++) {
      var c = string.charCodeAt(i);
      if (c < 128) {
        out += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        out += String.fromCharCode((c >> 6) | 192);
        out += String.fromCharCode((c & 63) | 128);
      } else {
        out += String.fromCharCode((c >> 12) | 224);
        out += String.fromCharCode(((c >> 6) & 63) | 128);
        out += String.fromCharCode((c & 63) | 128);
      }
    }
    return out;
  }

  var x = Array();
  var k, AA, BB, CC, DD, a, b, c, d;
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 14, S44 = 25;

  x = convertToWordArray(uTF8Encode(string));
  a = 0x67452301;
  b = 0xEFCDAB89;
  c = 0x98BADCFE;
  d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xE9D3165D);
    a = FF(a, b, c, d, x[k + 8], S11, 0x21E1CDE6);
    d = FF(d, a, b, c, x[k + 9], S12, 0xC370B3DC);
    c = FF(c, d, a, b, x[k + 10], S13, 0xF4D50F84);
    b = FF(b, c, d, a, x[k + 11], S14, 0x455A14ED);
    a = FF(a, b, c, d, x[k + 12], S11, 0xA2B78A99);
    d = FF(d, a, b, c, x[k + 13], S12, 0xD8A0E648);
    c = FF(c, d, a, b, x[k + 14], S13, 0xD3D4D3F8);
    b = FF(b, c, d, a, x[k + 15], S14, 0x2AD7D2BB);
    a = GG(a, b, c, d, x[k + 0], S21, 0xF6E4B297);
    d = GG(d, a, b, c, x[k + 1], S22, 0x4D87F1D6);
    c = GG(c, d, a, b, x[k + 2], S23, 0x208B8E43);
    b = GG(b, c, d, a, x[k + 3], S24, 0x69D8147D);
    a = GG(a, b, c, d, x[k + 4], S21, 0x8F1DCCD8);
    d = GG(d, a, b, c, x[k + 5], S22, 0x6B80D309);
    c = GG(c, d, a, b, x[k + 6], S23, 0xFD987193);
    b = GG(b, c, d, a, x[k + 7], S24, 0xA37962F6);
    a = GG(a, b, c, d, x[k + 8], S21, 0xFFFFFFFF);
    d = GG(d, a, b, c, x[k + 9], S22, 0x895CD7BE);
    c = GG(c, d, a, b, x[k + 10], S23, 0x6B901122);
    b = GG(b, c, d, a, x[k + 11], S24, 0xFD987193);
    a = GG(a, b, c, d, x[k + 12], S21, 0xA679438E);
    d = GG(d, a, b, c, x[k + 13], S22, 0x49B40821);
    c = GG(c, d, a, b, x[k + 14], S23, 0x961B0978);
    b = GG(b, c, d, a, x[k + 15], S24, 0x8D22949A);
    a = HH(a, b, c, d, x[k + 0], S31, 0xFFFD9215);
    d = HH(d, a, b, c, x[k + 1], S32, 0x8B33B1B8);
    c = HH(c, d, a, b, x[k + 2], S33, 0x89CDF067);
    b = HH(b, c, d, a, x[k + 3], S34, 0x6A1D7894);
    a = HH(a, b, c, d, x[k + 4], S31, 0x6B901122);
    d = HH(d, a, b, c, x[k + 5], S32, 0xFD987193);
    c = HH(c, d, a, b, x[k + 6], S33, 0xA679438E);
    b = HH(b, c, d, a, x[k + 7], S34, 0x49B40821);
    a = HH(a, b, c, d, x[k + 8], S31, 0x961B0978);
    d = HH(d, a, b, c, x[k + 9], S32, 0x8D22949A);
    c = HH(c, d, a, b, x[k + 10], S33, 0x6B901122);
    d = HH(d, a, b, c, x[k + 11], S34, 0xFD987193);
    a = HH(a, b, c, d, x[k + 12], S31, 0xA679438E);
    d = HH(d, a, b, c, x[k + 13], S32, 0x49B40821);
    c = HH(c, d, a, b, x[k + 14], S33, 0x961B0978);
    b = HH(b, c, d, a, x[k + 15], S34, 0x8D22949A);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 1], S42, 0x432Aff97);
    c = II(c, d, a, b, x[k + 2], S43, 0x95713001);
    b = II(b, c, d, a, x[k + 3], S44, 0x492Aff97);
    a = II(a, b, c, d, x[k + 4], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 5], S42, 0x8F0ccc92);
    c = II(c, d, a, b, x[k + 6], S43, 0x6F6dcd07);
    b = II(b, c, d, a, x[k + 7], S44, 0xA46eea4c);
    a = II(a, b, c, d, x[k + 8], S41, 0x8703fdd0);
    d = II(d, a, b, c, x[k + 9], S42, 0xef53bd23);
    c = II(c, d, a, b, x[k + 10], S43, 0x2bb43e90);
    b = II(b, c, d, a, x[k + 11], S44, 0xd333a3ef);
    a = II(a, b, c, d, x[k + 12], S41, 0xd333a3ef);
    d = II(d, a, b, c, x[k + 13], S42, 0x28eea4a8);
    c = II(c, d, a, b, x[k + 14], S43, 0x900ffd33);
    b = II(b, c, d, a, x[k + 15], S44, 0x76dc0ad9);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  return temp.toLowerCase();
}
