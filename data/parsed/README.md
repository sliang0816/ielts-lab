# Parsed data

One-time parsing outputs for authorized materials. Each passage JSON uses {schema:1,book,test,passage,title,paragraphs:[{id,text}],questions:[{number,type,prompt,options}],sourceSha256}. Keep official answers separately indexed. Do not claim OCR output is verified until checked. The frontend reads existing JSON, never repeats OCR automatically. When the source SHA-256 changes, regenerate the corresponding records. Do not publish full copyrighted text without appropriate rights.
