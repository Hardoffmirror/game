from pob_parser import PoBParser
import sys

p = PoBParser(open('build_code.txt').read())
p.parse()

items = p.root.find('Items')
print('ActiveItemSet:', items.get('activeItemSet'))
print('\nSlots:')

for s in items.findall('.//Slot')[:20]:
    print(f"  {s.get('name')} -> itemId={s.get('itemId')}")
