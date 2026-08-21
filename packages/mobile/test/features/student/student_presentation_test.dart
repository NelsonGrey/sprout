import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/models/student.dart';
import 'package:sprout/features/student/student_presentation.dart';

Student _student({String? gradeLevel}) => Student(
  id: 's1',
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  balanceCents: 0,
  ownerUids: const [],
  gradeLevel: gradeLevel,
);

void main() {
  test('is true for Pre-K/K and grades 1-2', () {
    expect(isEarlyReaderPresentation(_student(gradeLevel: 'K')), isTrue);
    expect(isEarlyReaderPresentation(_student(gradeLevel: '1')), isTrue);
    expect(isEarlyReaderPresentation(_student(gradeLevel: '2')), isTrue);
  });

  test('is false for grade 3 and up', () {
    expect(isEarlyReaderPresentation(_student(gradeLevel: '3')), isFalse);
    expect(isEarlyReaderPresentation(_student(gradeLevel: '6')), isFalse);
  });

  test('fails closed to the standard presentation when unresolvable', () {
    expect(isEarlyReaderPresentation(_student()), isFalse);
    expect(isEarlyReaderPresentation(_student(gradeLevel: '9')), isFalse);
  });
}
