import os
with open('cinematic-v3.html','w',encoding='utf-8') as f:
    f.write(open('cinematic-v2.html','r',encoding='utf-8').read())
print('copied base')
